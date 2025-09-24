/**
 * Notes Editor Component
 * 
 * Real-time collaborative notes editing with:
 * - Rich text editing capabilities (bold, italic, underline, lists, etc.)
 * - Real-time synchronization via Socket.io
 * - Full accessibility support (ARIA roles, live region announcements)
 * - Concurrent editing with batched updates and conflict resolution
 * - Screen reader support and keyboard navigation
 * - User presence and cursor tracking
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useSocket } from '../../contexts/SocketContext';
import { useUser } from '../../contexts/UserContext';
import { useBlindMode } from '../../contexts/BlindModeContext';

/**
 * Notes Editor Component
 * 
 * Provides real-time collaborative notes editing with comprehensive accessibility
 * Includes rich text editing, conflict resolution, and user presence tracking
 */
const NotesEditor = ({ 
  roomId, 
  roomData, 
  participants, 
  onRoomUpdate 
}) => {
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { connected, sendEvent, notesMetadata } = useSocket();
  const { user } = useUser();
  const { enabled: blindModeEnabled, announceToScreenReader } = useBlindMode();

  // Editor state
  const [content, setContent] = useState(roomData?.notes || '');
  const [lastSaved, setLastSaved] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Rich text formatting state
  const [formatting, setFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    listType: null, // 'bullet', 'number', null
    heading: null, // 'h1', 'h2', 'h3', null
    alignment: 'left' // 'left', 'center', 'right', 'justify'
  });

  // User presence and cursor tracking
  const [userCursors, setUserCursors] = useState({});
  const [typingUsers, setTypingUsers] = useState({});

  // Concurrent editing state
  const [isProcessingChanges, setIsProcessingChanges] = useState(false);
  const [changeQueue, setChangeQueue] = useState([]);
  
  // Blind Mode state
  const [lastNoteUpdate, setLastNoteUpdate] = useState(null);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  
  // Typing state to prevent cursor jumping
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Refs with proper cleanup
  const editorRef = useRef(null);
  const changeTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const announcementTimeoutRef = useRef(null);
  const previousContentRef = useRef(roomData?.notes || '');
  const cleanupRefs = useRef([]);

  // Debounce settings
  const CHANGE_DEBOUNCE_MS = 300;

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    // Clear all timeouts
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
      changeTimeoutRef.current = null;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
      announcementTimeoutRef.current = null;
    }
    
    // Clear all cleanup refs
    cleanupRefs.current.forEach(cleanup => {
      if (cleanup) {
        cleanup();
      }
    });
    cleanupRefs.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * Analyze note changes for Blind Mode announcements
   * 
   * @param {string} oldContent - Previous content
   * @param {string} newContent - New content
   * @param {string} author - Author of the change
   * @param {string} actionType - Type of action (add, edit, delete)
   * @returns {Object} Change analysis with summary
   */
  const analyzeNoteChange = useCallback((oldContent, newContent, author, actionType = 'edit') => {
    const oldText = oldContent.replace(/<[^>]*>/g, '').trim();
    const newText = newContent.replace(/<[^>]*>/g, '').trim();
    
    const oldWords = oldText.split(/\s+/).filter(word => word.length > 0);
    const newWords = newText.split(/\s+/).filter(word => word.length > 0);
    
    const wordsAdded = newWords.length - oldWords.length;
    const wordsRemoved = oldWords.length - newWords.length;
    
    // Detect if content was added, removed, or modified
    let changeType = 'modified';
    let contentSummary = '';
    
    if (wordsAdded > 0 && wordsRemoved === 0) {
      changeType = 'added';
      // Extract the new content (simplified)
      const addedContent = newText.substring(oldText.length).trim();
      contentSummary = addedContent.length > 50 
        ? `"${addedContent.substring(0, 50)}..."`
        : `"${addedContent}"`;
    } else if (wordsRemoved > 0 && wordsAdded === 0) {
      changeType = 'removed';
      contentSummary = `${wordsRemoved} word${wordsRemoved > 1 ? 's' : ''}`;
    } else if (wordsAdded > 0 || wordsRemoved > 0) {
      changeType = 'modified';
      contentSummary = `${Math.abs(wordsAdded - wordsRemoved)} word${Math.abs(wordsAdded - wordsRemoved) > 1 ? 's' : ''}`;
    } else {
      changeType = 'edited';
      contentSummary = 'content';
    }
    
    // Generate announcement
    let announcement = '';
    if (author === 'You') {
      announcement = `You ${changeType} note: ${contentSummary}`;
    } else {
      announcement = `${author} ${changeType} note: ${contentSummary}`;
    }
    
    return {
      announcement,
      changeType,
      contentSummary,
      wordsAdded,
      wordsRemoved,
      actionType,
      timestamp: Date.now(),
      author
    };
  }, []);

  /**
   * Announce note changes for Blind Mode
   * 
   * @param {Object} changeAnalysis - Analysis result from analyzeNoteChange
   */
  const announceNoteChange = useCallback((changeAnalysis) => {
    if (!blindModeEnabled) return;
    
    // Clear any existing announcement
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
    
    // Set new announcement
    setCurrentAnnouncement(changeAnalysis.announcement);
    
    // Announce the change
    announceToScreenReader(changeAnalysis.announcement);
    
    // Update last note update
    setLastNoteUpdate(changeAnalysis);
    
    // Clear announcement after a delay
    announcementTimeoutRef.current = setTimeout(() => {
      setCurrentAnnouncement(null);
    }, 2000);
  }, [blindModeEnabled, announceToScreenReader]);

  /**
   * Preserve cursor position when updating content
   */
  const preserveCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      return {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset
      };
    }
    return null;
  }, []);

  /**
   * Restore cursor position after content update
   */
  const restoreCursorPosition = useCallback((savedPosition) => {
    if (!savedPosition) return;
    
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Try to restore the exact position
      if (savedPosition.startContainer && savedPosition.startContainer.parentNode) {
        range.setStart(savedPosition.startContainer, savedPosition.startOffset);
        range.setEnd(savedPosition.endContainer, savedPosition.endOffset);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // Fallback: place cursor at end
        const editor = editorRef.current;
        if (editor) {
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } catch (error) {
      // Fallback: place cursor at end
      const editor = editorRef.current;
      if (editor) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, []);

  /**
   * Initialize editor content from room data
   */
  useEffect(() => {
    if (roomData?.notes !== undefined && roomData.notes !== content && !isUserTyping) {
      setContent(roomData.notes);
      setHasUnsavedChanges(false);
      previousContentRef.current = roomData.notes;
      
      // Ensure editor content is updated
      if (editorRef.current) {
        // Preserve cursor position before updating content
        const savedPosition = preserveCursorPosition();
        
        editorRef.current.innerHTML = roomData.notes;
        // Ensure text color is visible
        editorRef.current.style.color = '#ffffff'; // White text
        // Force all child elements to inherit proper color
        const allElements = editorRef.current.querySelectorAll('*');
        allElements.forEach(el => {
          el.style.color = '';
        });
        
        // Restore cursor position after content update
        if (savedPosition) {
          setTimeout(() => restoreCursorPosition(savedPosition), 0);
        }
      }
    }
  }, [roomData?.notes, preserveCursorPosition, restoreCursorPosition, isUserTyping]);

  /**
   * Ensure text visibility on mount and content changes
   */
  useEffect(() => {
    const ensureTextVisibility = () => {
      if (editorRef.current) {
        // Set explicit text color
        editorRef.current.style.color = '#ffffff';
        editorRef.current.style.backgroundColor = 'transparent';
        
        // Remove any inline color styles from child elements
        const allElements = editorRef.current.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.style.color) {
            el.style.color = '';
          }
        });
      }
    };

    // Run immediately
    ensureTextVisibility();

    // Run after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(ensureTextVisibility, 100);

    return () => clearTimeout(timeoutId);
  }, [content]);

  /**
   * Handle external content changes from other users
   */
  useEffect(() => {
    if (roomData?.notes !== undefined && roomData.notes !== content && roomData.notes !== previousContentRef.current && !isUserTyping) {
      const previousContent = previousContentRef.current;
      
      setContent(roomData.notes);
      setHasUnsavedChanges(false);
      
      // Ensure editor content is updated
      if (editorRef.current) {
        // Preserve cursor position before updating content
        const savedPosition = preserveCursorPosition();
        
        editorRef.current.innerHTML = roomData.notes;
        // Ensure text color is visible
        editorRef.current.style.color = '#ffffff'; // White text
        // Force all child elements to inherit proper color
        const allElements = editorRef.current.querySelectorAll('*');
        allElements.forEach(el => {
          el.style.color = '';
        });
        
        // Restore cursor position after content update
        if (savedPosition) {
          setTimeout(() => restoreCursorPosition(savedPosition), 0);
        }
      }
      
      // Analyze changes for Blind Mode
      if (blindModeEnabled && previousContent !== roomData.notes) {
        // Extract author from socket metadata if available
        const author = notesMetadata?.author || 'Another user';
        const actionType = notesMetadata?.actionType || 'edit';
        const changeAnalysis = analyzeNoteChange(previousContent, roomData.notes, author, actionType);
        announceNoteChange(changeAnalysis);
      }
      
      // Update previous content reference
      previousContentRef.current = roomData.notes;
    }
  }, [roomData?.notes, content, blindModeEnabled, analyzeNoteChange, announceNoteChange, notesMetadata, preserveCursorPosition, restoreCursorPosition, isUserTyping]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Process batched changes to reduce network traffic
   */
  const processBatchedChanges = useCallback(() => {
    if (isProcessingChanges || changeQueue.length === 0) return;

    setIsProcessingChanges(true);

    // Get all pending changes
    const changes = [...changeQueue];
    setChangeQueue([]);

    // Send batched changes
    if (connected && sendEvent) {
      sendEvent('note-change', {
        roomId,
        changes,
        metadata: {
          userId: user?.userId,
          username: user?.username,
          timestamp: Date.now()
        }
      });
    }

    // Reset processing state
    setTimeout(() => {
      setIsProcessingChanges(false);
    }, 100);
  }, [isProcessingChanges, changeQueue, connected, sendEvent, roomId, user]);

  /**
   * Handle content changes with debouncing and batching
   */
  const handleContentChange = useCallback((newContent) => {
    const previousContent = previousContentRef.current;
    
    setContent(newContent);
    setHasUnsavedChanges(true);
    setLastSaved(Date.now());

    // Analyze changes for Blind Mode
    if (blindModeEnabled && previousContent !== newContent) {
      const changeAnalysis = analyzeNoteChange(previousContent, newContent, 'You', 'edit');
      announceNoteChange(changeAnalysis);
    }
    
    // Update previous content reference
    previousContentRef.current = newContent;

    // Clear existing timeout
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    // Debounce changes
    changeTimeoutRef.current = setTimeout(() => {
      const change = {
        id: `change-${Date.now()}-${Math.random()}`,
        type: 'content-change',
        content: newContent,
        timestamp: Date.now(),
        userId: user?.userId,
        username: user?.username
      };

      // Add to change queue
      setChangeQueue(prev => [...prev, change]);

      // Process changes in batches
      if (!isProcessingChanges) {
        processBatchedChanges();
      }
    }, CHANGE_DEBOUNCE_MS);
  }, [user, isProcessingChanges, processBatchedChanges, blindModeEnabled, analyzeNoteChange, announceNoteChange]);

  /**
   * Handle cursor position changes
   */
  const handleCursorChange = useCallback((position) => {
    if (!user || !connected) return;

    const cursorData = {
      userId: user.userId,
      username: user.username,
      position,
      timestamp: Date.now()
    };

    // Update local cursor
    setUserCursors(prev => ({
      ...prev,
      [user.userId]: cursorData
    }));

    // Send cursor update
    if (sendEvent) {
      sendEvent('cursor-update', {
        roomId,
        cursor: cursorData
      });
    }
  }, [user, connected, sendEvent, roomId]);

  /**
   * Handle text selection changes
   */
  const handleSelectionUpdate = useCallback((selection) => {
    if (!user || !connected) return;

    const selectionData = {
      userId: user.userId,
      username: user.username,
      selection,
      timestamp: Date.now()
    };

    // Note: User selections tracking removed for simplicity

    // Send selection update
    if (sendEvent) {
      sendEvent('selection-update', {
        roomId,
        selection: selectionData
      });
    }
  }, [user, connected, sendEvent, roomId]);

  /**
   * Handle typing start
   */
  const handleTypingStart = useCallback(() => {
    if (!user || !connected) return;

    setTypingUsers(prev => ({
      ...prev,
      [user.userId]: {
        username: user.username,
        timestamp: Date.now()
      }
    }));

    if (sendEvent) {
      sendEvent('typing-start', {
        roomId,
        userId: user.userId,
        username: user.username
      });
    }
  }, [user, connected, sendEvent, roomId]);

  /**
   * Handle typing stop
   */
  const handleTypingStop = useCallback(() => {
    if (!user || !connected) return;

    setTypingUsers(prev => {
      const newTypingUsers = { ...prev };
      delete newTypingUsers[user.userId];
      return newTypingUsers;
    });

    if (sendEvent) {
      sendEvent('typing-stop', {
        roomId,
        userId: user.userId
      });
    }
  }, [user, connected, sendEvent, roomId]);

  /**
   * Apply rich text formatting
   */
  const applyFormatting = useCallback((format) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const selection = window.getSelection();
    
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    // Focus the editor first
    editor.focus();

    // Handle different formatting types
    switch (format) {
      case 'bold':
        document.execCommand('bold');
        break;
      case 'italic':
        document.execCommand('italic');
        break;
      case 'underline':
        document.execCommand('underline');
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough');
        break;
      case 'bullet':
        document.execCommand('insertUnorderedList');
        break;
      case 'number':
        document.execCommand('insertOrderedList');
        break;
      case 'h1':
        document.execCommand('formatBlock', false, 'h1');
        break;
      case 'h2':
        document.execCommand('formatBlock', false, 'h2');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, 'h3');
        break;
      case 'left':
        document.execCommand('justifyLeft');
        break;
      case 'center':
        document.execCommand('justifyCenter');
        break;
      case 'right':
        document.execCommand('justifyRight');
        break;
      case 'justify':
        document.execCommand('justifyFull');
        break;
      default:
        console.warn(`Unknown format: ${format}`);
        break;
    }

    // Update formatting state for toggle buttons
    if (['bold', 'italic', 'underline', 'strikethrough'].includes(format)) {
      setFormatting(prev => ({
        ...prev,
        [format]: !prev[format]
      }));
    } else if (['bullet', 'number'].includes(format)) {
      setFormatting(prev => ({
        ...prev,
        listType: prev.listType === format ? null : format
      }));
    } else if (['h1', 'h2', 'h3'].includes(format)) {
      setFormatting(prev => ({
        ...prev,
        heading: prev.heading === format ? null : format
      }));
    } else if (['left', 'center', 'right', 'justify'].includes(format)) {
      setFormatting(prev => ({
        ...prev,
        alignment: format
      }));
    }

    // Trigger content change
    handleContentChange(editor.innerHTML);

    if (screenReader) {
      announce(`Applied ${format} formatting`, 'polite');
    }
  }, [handleContentChange, screenReader, announce]);

  /**
   * Handle undo
   */
  const handleUndo = useCallback(() => {
    if (!editorRef.current) return;
    
    document.execCommand('undo');
    
    if (screenReader) {
      announce('Undo applied', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Handle redo
   */
  const handleRedo = useCallback(() => {
    if (!editorRef.current) return;
    
    document.execCommand('redo');
    
    if (screenReader) {
      announce('Redo applied', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Handle indent
   */
  const handleIndent = useCallback(() => {
    if (!editorRef.current) return;
    
    document.execCommand('indent');
    
    if (screenReader) {
      announce('Indent applied', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Handle outdent
   */
  const handleOutdent = useCallback(() => {
    if (!editorRef.current) return;
    
    document.execCommand('outdent');
    
    if (screenReader) {
      announce('Outdent applied', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Handle save
   */
  const handleSave = useCallback(() => {
    if (isSaving || !hasUnsavedChanges) return;

    setIsSaving(true);

    // Clear existing save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save
    saveTimeoutRef.current = setTimeout(() => {
      if (onRoomUpdate) {
        onRoomUpdate({ notes: content });
      }

      setHasUnsavedChanges(false);
      setLastSaved(Date.now());
      setIsSaving(false);

      // Announce save completion
      if (screenReader) {
        announce('Notes saved successfully', 'polite');
      }
    }, 1000);
  }, [isSaving, hasUnsavedChanges, content, onRoomUpdate, screenReader, announce]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event) => {
    if (!keyboardNavigation) return;

    // Handle formatting shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          applyFormatting('bold');
          break;
        case 'i':
          event.preventDefault();
          applyFormatting('italic');
          break;
        case 'u':
          event.preventDefault();
          applyFormatting('underline');
          break;
        case 's':
          event.preventDefault();
          handleSave();
          break;
        case 'z':
          if (event.shiftKey) {
            event.preventDefault();
            handleRedo();
          } else {
            event.preventDefault();
            handleUndo();
          }
          break;
        case 'y':
          event.preventDefault();
          handleRedo();
          break;
        case ']':
          event.preventDefault();
          handleIndent();
          break;
        case '[':
          event.preventDefault();
          handleOutdent();
          break;
        case 'n':
        case 'N':
          // Ctrl+Shift+N: Read last note update
          if (event.shiftKey) {
            event.preventDefault();
            if (blindModeEnabled && lastNoteUpdate) {
              announceToScreenReader(`Last note update: ${lastNoteUpdate.announcement}`);
            } else if (blindModeEnabled) {
              announceToScreenReader('No recent note updates to announce');
            }
          }
          break;
        default:
          // No shortcut for this key
          break;
      }
    }

    // Handle typing events
    if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
      handleTypingStart();
    }
  }, [keyboardNavigation, applyFormatting, handleTypingStart, blindModeEnabled, lastNoteUpdate, announceToScreenReader, handleSave]);

  /**
   * Handle keyboard up
   */
  const handleKeyUp = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleTypingStop();
    }
  }, [handleTypingStop]);

  /**
   * Place cursor at end of content
   */
  const placeCursorAtEnd = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    // Ensure cursor is at the end when focusing
    setTimeout(() => {
      placeCursorAtEnd();
    }, 0);
    
    if (screenReader) {
      announce('Notes editor focused', 'polite');
    }
  }, [placeCursorAtEnd, screenReader, announce]);

  const handleBlur = useCallback(() => {
    handleTypingStop();
    if (screenReader) {
      announce('Notes editor focus lost', 'polite');
    }
  }, [handleTypingStop, screenReader, announce]);



  /**
   * Handle input events
   */
  const handleInput = useCallback((event) => {
    setIsUserTyping(true);
    const newContent = event.target.innerHTML;
    handleContentChange(newContent);
    
    // Reset typing flag after a short delay
    setTimeout(() => setIsUserTyping(false), 100);
  }, [handleContentChange]);

  /**
   * Handle selection events
   */
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const position = range.startOffset;
      handleCursorChange(position);
      handleSelectionUpdate(selection);
      
      // Update formatting state based on current selection
      updateFormattingState();
    }
  }, [handleCursorChange, handleSelectionUpdate]);

  /**
   * Update formatting state based on current selection
   */
  const updateFormattingState = useCallback(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const selection = window.getSelection();
    
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Check if we're in a formatted element
    const isBold = document.queryCommandState('bold');
    const isItalic = document.queryCommandState('italic');
    const isUnderline = document.queryCommandState('underline');
    const isStrikethrough = document.queryCommandState('strikeThrough');
    
    // Check for lists
    const isInList = container.nodeType === Node.ELEMENT_NODE && 
      (container.tagName === 'UL' || container.tagName === 'OL' || 
       container.closest('ul') || container.closest('ol'));
    
    // Check for headings
    let currentHeading = null;
    if (container.nodeType === Node.ELEMENT_NODE) {
      if (['H1', 'H2', 'H3'].includes(container.tagName)) {
        currentHeading = container.tagName.toLowerCase();
      } else {
        const heading = container.closest('h1, h2, h3');
        if (heading) {
          currentHeading = heading.tagName.toLowerCase();
        }
      }
    }
    
    // Update formatting state
    setFormatting(prev => ({
      ...prev,
      bold: isBold,
      italic: isItalic,
      underline: isUnderline,
      strikethrough: isStrikethrough,
      listType: isInList ? (container.closest('ul') ? 'bullet' : 'number') : null,
      heading: currentHeading
    }));
  }, []);

  /**
   * Get editor status for screen readers
   */
  const getEditorStatus = useCallback(() => {
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
    const charCount = content.replace(/<[^>]*>/g, '').length;
    const typingCount = Object.keys(typingUsers).length;
    const cursorCount = Object.keys(userCursors).length;
    
    return `Notes editor: ${wordCount} words, ${charCount} characters, ${typingCount} typing, ${cursorCount} cursors. ${connected ? 'Connected' : 'Disconnected'}.`;
  }, [content, typingUsers, userCursors, connected]);

  /**
   * Render user cursors
   */
  const renderUserCursors = () => {
    return Object.entries(userCursors).map(([userId, cursorData]) => {
      if (userId === user?.userId) return null;

      return (
        <div
          key={userId}
          className="absolute pointer-events-none z-10"
          style={{
            left: `${cursorData.position * 8}px`, // Approximate character width
            top: '0px'
          }}
        >
          <div className="flex items-center space-x-1">
            <div className="w-0.5 h-4 bg-primary-500" />
            <span className="text-xs bg-primary-500 text-white px-1 py-0.5 rounded">
              {cursorData.username}
            </span>
          </div>
        </div>
      );
    });
  };

  /**
   * Render typing indicators
   */
  const renderTypingIndicators = () => {
    const typingUsersList = Object.values(typingUsers);
    if (typingUsersList.length === 0) return null;

    return (
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 dark:text-gray-400">
        {typingUsersList.map((typingUser, index) => (
          <span key={typingUser.username}>
            {typingUser.username} is typing
            {index < typingUsersList.length - 1 ? ', ' : ''}
          </span>
        ))}
      </div>
    );
  };

  /**
   * Render formatting toolbar
   */
  const renderFormattingToolbar = () => {
    return (
      <div className="flex items-center space-x-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-x-auto">
        {/* Text formatting */}
        <button
          onClick={() => applyFormatting('bold')}
          className={`btn btn-sm ${formatting.bold ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Bold"
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        
        <button
          onClick={() => applyFormatting('italic')}
          className={`btn btn-sm ${formatting.italic ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Italic"
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        
        <button
          onClick={() => applyFormatting('underline')}
          className={`btn btn-sm ${formatting.underline ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Underline"
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        
        <button
          onClick={() => applyFormatting('strikethrough')}
          className={`btn btn-sm ${formatting.strikethrough ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Strikethrough"
          title="Strikethrough"
        >
          <s>S</s>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Undo/Redo */}
        <button
          onClick={handleUndo}
          className="btn btn-sm btn-outline"
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        
        <button
          onClick={handleRedo}
          className="btn btn-sm btn-outline"
          aria-label="Redo"
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Lists */}
        <button
          onClick={() => applyFormatting('bullet')}
          className={`btn btn-sm ${formatting.listType === 'bullet' ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Bullet list"
          title="Bullet list"
        >
          • List
        </button>
        
        <button
          onClick={() => applyFormatting('number')}
          className={`btn btn-sm ${formatting.listType === 'number' ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Numbered list"
          title="Numbered list"
        >
          1. List
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Headings */}
        <button
          onClick={() => applyFormatting('h1')}
          className={`btn btn-sm ${formatting.heading === 'h1' ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Heading 1"
          title="Heading 1"
        >
          H1
        </button>
        
        <button
          onClick={() => applyFormatting('h2')}
          className={`btn btn-sm ${formatting.heading === 'h2' ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Heading 2"
          title="Heading 2"
        >
          H2
        </button>
        
        <button
          onClick={() => applyFormatting('h3')}
          className={`btn btn-sm ${formatting.heading === 'h3' ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Heading 3"
          title="Heading 3"
        >
          H3
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Indent/Outdent */}
        <button
          onClick={handleOutdent}
          className="btn btn-sm btn-outline"
          aria-label="Outdent"
          title="Outdent (Ctrl+[)"
        >
          ⇐
        </button>
        
        <button
          onClick={handleIndent}
          className="btn btn-sm btn-outline"
          aria-label="Indent"
          title="Indent (Ctrl+])"
        >
          ⇒
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Alignment */}
        <button
          onClick={() => applyFormatting('left')}
          className={`btn btn-sm ${formatting.alignment === 'left' ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Align left"
          title="Align left"
        >
          ←
        </button>
        
        <button
          onClick={() => applyFormatting('center')}
          className={`btn btn-sm ${formatting.alignment === 'center' ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Align center"
          title="Align center"
        >
          ↔
        </button>
        
        <button
          onClick={() => applyFormatting('right')}
          className={`btn btn-sm ${formatting.alignment === 'right' ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Align right"
          title="Align right"
        >
          →
        </button>
        
        <button
          onClick={() => applyFormatting('justify')}
          className={`btn btn-sm ${formatting.alignment === 'justify' ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Justify"
          title="Justify"
        >
          ⇔
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving}
          className="btn btn-sm btn-primary"
          aria-label="Save notes"
          title="Save notes (Ctrl+S)"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    );
  };

  /**
   * Render editor footer
   */
  const renderEditorFooter = () => {
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
    const charCount = content.replace(/<[^>]*>/g, '').length;
    const lastSavedTime = new Date(lastSaved).toLocaleTimeString();

    return (
      <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
          <span>Last saved: {lastSavedTime}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              Unsaved changes
            </span>
          )}
          {isSaving && (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Saving...
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 min-h-0">
      {/* Formatting Toolbar */}
      <div className="flex-shrink-0">
        {renderFormattingToolbar()}
      </div>

      {/* Editor Container */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* Editor */}
        <div
          ref={editorRef}
          className="h-full w-full p-4 overflow-y-auto focus:outline-none prose prose-sm max-w-none"
          style={{ 
            color: '#ffffff',
            backgroundColor: 'transparent'
          }}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSelect={handleSelectionChange}
          role="textbox"
          aria-label="Notes editor"
          aria-describedby="editor-help"
          aria-multiline="true"
          aria-required="false"
          tabIndex={0}
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* User Cursors */}
        {renderUserCursors()}

        {/* Typing Indicators */}
        {renderTypingIndicators()}
      </div>

      {/* Editor Footer */}
      {renderEditorFooter()}

      {/* Screen Reader Status */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="editor-status"
      >
        {getEditorStatus()}
      </div>

      {/* Blind Mode Note Change Announcements */}
      {blindModeEnabled && (
        <div 
          className="sr-only" 
          aria-live="polite" 
          aria-atomic="true"
          id="note-change-announcements"
          role="status"
          aria-label="Note change announcements"
        >
          {currentAnnouncement && (
            <span key={Date.now()}>
              {currentAnnouncement}
            </span>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {keyboardNavigation && (
        <div className="sr-only" id="editor-keyboard-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>Ctrl+B: Bold</li>
            <li>Ctrl+I: Italic</li>
            <li>Ctrl+U: Underline</li>
            <li>Ctrl+S: Save</li>
            {blindModeEnabled && (
              <li>Ctrl+Shift+N: Read last note update</li>
            )}
            <li>Tab: Navigate between elements</li>
            <li>Click: Select text</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotesEditor;