/**
 * Notes Editor Component
 * 
 * Real-time collaborative notes editor with:
 * - Rich text editing capabilities
 * - Full accessibility support (ARIA labels, keyboard navigation)
 * - Socket.io integration for live synchronization
 * - Screen reader support and focus management
 * - Markdown support with live preview
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useUser } from '../../contexts/UserContext';

/**
 * Notes Editor Component
 * 
 * Provides real-time collaborative note-taking with rich text editing
 * Includes comprehensive accessibility features and live synchronization
 */
const NotesEditor = ({ onNoteChange, participants }) => {
  const { 
    notesContent, 
    sendNoteChange, 
    connected 
  } = useSocket();
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { user } = useUser();

  // Local state
  const [localContent, setLocalContent] = useState(notesContent || '');
  const [isTyping, setIsTyping] = useState(false);
  const [lastChangeTime, setLastChangeTime] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Refs
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastSyncedContentRef = useRef(notesContent || '');
  const isLocalChangeRef = useRef(false);

  // Debounce delay for sending changes (ms)
  const DEBOUNCE_DELAY = 500;
  const TYPING_INDICATOR_DELAY = 1000;

  /**
   * Handle content changes
   * 
   * Manages local state updates and debounced server synchronization
   */
  const handleContentChange = useCallback((event) => {
    if (isLocalChangeRef.current) {
      isLocalChangeRef.current = false;
      return;
    }

    const content = event.target.value;
    setLocalContent(content);
    setHasUnsavedChanges(content !== lastSyncedContentRef.current);
    setLastChangeTime(Date.now());

    // Update cursor position
    setCursorPosition(event.target.selectionStart);
    setSelection({
      start: event.target.selectionStart,
      end: event.target.selectionEnd,
    });

    // Debounce sending changes to server
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (connected && onNoteChange) {
        sendNoteChange(content);
        lastSyncedContentRef.current = content;
        setHasUnsavedChanges(false);
      }
    }, DEBOUNCE_DELAY);

    // Show typing indicator
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), TYPING_INDICATOR_DELAY);
  }, [connected, onNoteChange, sendNoteChange]);

  /**
   * Handle external content changes from other users
   * 
   * Updates the editor content when receiving changes from Socket.io
   */
  useEffect(() => {
    if (notesContent !== localContent && notesContent !== lastSyncedContentRef.current) {
      isLocalChangeRef.current = true;
      
      if (textareaRef.current) {
        textareaRef.current.value = notesContent;
        setLocalContent(notesContent);
        lastSyncedContentRef.current = notesContent;
        setHasUnsavedChanges(false);
        
        if (screenReader) {
          announce('Notes updated by another user', 'polite');
        }
      }
    }
  }, [notesContent, localContent, screenReader, announce]);

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (screenReader) {
      announce('Notes editor focused', 'polite');
    }
  }, [screenReader, announce]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (screenReader) {
      announce('Notes editor focus lost', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Handle selection changes
   */
  const handleSelectionChange = useCallback(() => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      setSelection({ start, end });
      setCursorPosition(start);

      // Announce selection for screen readers
      if (screenReader && isFocused) {
        if (start === end) {
          announce(`Cursor at position ${start}`, 'polite');
        } else {
          announce(`Selected from position ${start} to ${end}`, 'polite');
        }
      }
    }
  }, [screenReader, isFocused, announce]);

  /**
   * Handle keyboard navigation for accessibility
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isFocused || !keyboardNavigation) return;

      // Handle special accessibility shortcuts
      switch (event.key) {
        case 'F6':
          // Focus notes editor
          event.preventDefault();
          textareaRef.current?.focus();
          break;
        case 'Escape':
          // Clear selection
          if (textareaRef.current) {
            const pos = textareaRef.current.selectionStart;
            textareaRef.current.setSelectionRange(pos, pos);
          }
          break;
        case 'F2':
          // Toggle preview
          event.preventDefault();
          setShowPreview(!showPreview);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, keyboardNavigation, showPreview]);

  /**
   * Handle component cleanup
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Get editor status for screen readers
   */
  const getEditorStatus = () => {
    const lines = localContent.split('\n').length;
    const characters = localContent.length;
    const words = localContent.split(/\s+/).filter(word => word.length > 0).length;
    
    return `Notes editor: ${lines} lines, ${characters} characters, ${words} words. ${hasUnsavedChanges ? 'Unsaved changes.' : 'All changes saved.'}`;
  };

  /**
   * Render markdown preview
   */
  const renderMarkdownPreview = (content) => {
    // Simple markdown rendering (in a real app, you'd use a proper markdown parser)
    return content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n/gim, '<br>');
  };

  /**
   * Handle markdown shortcuts
   */
  const handleKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          insertMarkdown('**', '**');
          break;
        case 'i':
          event.preventDefault();
          insertMarkdown('*', '*');
          break;
        case 'k':
          event.preventDefault();
          insertMarkdown('[', '](url)');
          break;
        case '`':
          event.preventDefault();
          insertMarkdown('`', '`');
          break;
      }
    }
  };

  /**
   * Insert markdown formatting
   */
  const insertMarkdown = (before, after) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = localContent.substring(start, end);
      const newText = before + selectedText + after;
      
      const newContent = localContent.substring(0, start) + newText + localContent.substring(end);
      setLocalContent(newContent);
      
      // Update textarea
      textareaRef.current.value = newContent;
      
      // Set cursor position
      const newCursorPos = start + before.length + selectedText.length;
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger change event
      handleContentChange({ target: textareaRef.current });
      
      if (screenReader) {
        announce(`Applied ${before}${after} formatting`, 'polite');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Collaborative Notes
          </h2>
          
          {/* Markdown Shortcuts */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Shortcuts:</span>
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+B</kbd>
            <span>Bold</span>
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+I</kbd>
            <span>Italic</span>
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+K</kbd>
            <span>Link</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Status Indicators */}
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              <div 
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`}
                aria-label={connected ? 'Connected' : 'Disconnected'}
              />
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>Typing...</span>
              </div>
            )}

            {/* Unsaved Changes */}
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`btn ${showPreview ? 'btn-primary' : 'btn-outline'} text-sm py-1 px-3`}
              aria-label={showPreview ? 'Hide preview' : 'Show preview'}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            
            <button
              onClick={() => textareaRef.current?.focus()}
              className="btn btn-outline text-sm py-1 px-3"
              aria-label="Focus notes editor"
            >
              Focus Editor
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex">
        {/* Text Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col`}>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleContentChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onSelect={handleSelectionChange}
              onKeyDown={handleKeyDown}
              className="w-full h-full p-4 border-0 resize-none focus:outline-none focus:ring-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Start writing your notes here... Use Markdown for formatting.

# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
`Code text`

[Link text](https://example.com)

- List item 1
- List item 2
- List item 3"
              aria-label="Collaborative notes editor"
              aria-describedby="notes-help"
              style={{
                fontSize: screenReader ? '16px' : '14px',
                lineHeight: screenReader ? '1.6' : '1.5',
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
              }}
            />
            
            <div id="notes-help" className="sr-only">
              {getEditorStatus()}
            </div>
          </div>
        </div>

        {/* Markdown Preview */}
        {showPreview && (
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700">
            <div className="p-4 h-full overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview
              </h3>
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdownPreview(localContent) 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Position {cursorPosition}</span>
          <span>{localContent.split('\n').length} lines</span>
          <span>{localContent.length} characters</span>
          <span>{localContent.split(/\s+/).filter(word => word.length > 0).length} words</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {participants && (
            <span>{Object.keys(participants).length} participants</span>
          )}
          <span>Markdown supported</span>
        </div>
      </div>

      {/* Screen Reader Status */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="notes-status"
      >
        {getEditorStatus()}
      </div>

      {/* Keyboard Shortcuts Help */}
      {keyboardNavigation && (
        <div className="sr-only" id="notes-keyboard-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>F6: Focus notes editor</li>
            <li>F2: Toggle preview</li>
            <li>Escape: Clear selection</li>
            <li>Ctrl+B: Bold text</li>
            <li>Ctrl+I: Italic text</li>
            <li>Ctrl+K: Insert link</li>
            <li>Ctrl+`: Code text</li>
            <li>Ctrl+A: Select all</li>
            <li>Ctrl+C: Copy</li>
            <li>Ctrl+V: Paste</li>
            <li>Ctrl+X: Cut</li>
            <li>Ctrl+Z: Undo</li>
            <li>Ctrl+Y: Redo</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotesEditor;