/**
 * Code Editor Component
 * 
 * Real-time collaborative code editor using Monaco Editor with:
 * - Full accessibility support (ARIA labels, keyboard navigation)
 * - Socket.io integration for live synchronization
 * - Conflict resolution and state management
 * - Screen reader support and focus management
 * - Language detection and syntax highlighting
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { useSocket } from '../../contexts/SocketContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useUser } from '../../contexts/UserContext';

/**
 * Code Editor Component
 * 
 * Provides real-time collaborative code editing with Monaco Editor
 * Includes comprehensive accessibility features and live synchronization
 */
const CodeEditor = ({ onCodeChange, participants }) => {
  const { 
    codeContent, 
    codeLanguage, 
    sendCodeChange, 
    connected 
  } = useSocket();
  const { announce, screenReader, keyboardNavigation } = useAccessibility();

  // Local state
  const [localContent, setLocalContent] = useState(codeContent || '');
  const [localLanguage, setLocalLanguage] = useState(codeLanguage || 'javascript');
  const [isTyping, setIsTyping] = useState(false);
  const [lastChangeTime, setLastChangeTime] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [selection, setSelection] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastSyncedContentRef = useRef(codeContent || '');
  const isLocalChangeRef = useRef(false);

  // Debounce delay for sending changes (ms)
  const DEBOUNCE_DELAY = 300;
  const TYPING_INDICATOR_DELAY = 1000;

  /**
   * Initialize Monaco Editor
   * 
   * Sets up the editor with accessibility features and event handlers
   */
  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure editor for accessibility
    editor.updateOptions({
      // Accessibility options
      accessibilitySupport: screenReader ? 'on' : 'auto',
      readOnly: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      minimap: { enabled: false }, // Disable minimap for better accessibility
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      
      // Keyboard navigation
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,
      
      // Visual accessibility
      fontSize: screenReader ? 16 : 14,
      lineHeight: screenReader ? 1.6 : 1.2,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      
      // Focus and selection
      selectOnLineNumbers: true,
      automaticLayout: true,
    });

    // Set up event listeners
    setupEventListeners(editor);

    // Announce editor ready for screen readers
    if (screenReader) {
      announce('Code editor loaded and ready for input', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Set up Monaco Editor event listeners
   * 
   * Handles content changes, cursor movement, and accessibility events
   */
  const setupEventListeners = useCallback((editor) => {
    // Content change handler
    editor.onDidChangeModelContent((event) => {
      if (isLocalChangeRef.current) {
        isLocalChangeRef.current = false;
        return;
      }

      const content = editor.getValue();
      const language = editor.getModel()?.getLanguageId() || 'javascript';
      
      setLocalContent(content);
      setLocalLanguage(language);
      setHasUnsavedChanges(content !== lastSyncedContentRef.current);
      setLastChangeTime(Date.now());

      // Debounce sending changes to server
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (connected && onCodeChange) {
          const cursor = editor.getPosition();
          sendCodeChange(content, language, cursor);
          lastSyncedContentRef.current = content;
          setHasUnsavedChanges(false);
        }
      }, DEBOUNCE_DELAY);

      // Show typing indicator
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), TYPING_INDICATOR_DELAY);
    });

    // Cursor position change handler
    editor.onDidChangeCursorPosition((event) => {
      setCursorPosition(event.position);
      
      // Announce cursor position for screen readers
      if (screenReader && isFocused) {
        const { lineNumber, column } = event.position;
        announce(`Line ${lineNumber}, column ${column}`, 'polite');
      }
    });

    // Selection change handler
    editor.onDidChangeCursorSelection((event) => {
      setSelection(event.selection);
      
      // Announce selection for screen readers
      if (screenReader && isFocused) {
        const { startLineNumber, endLineNumber, startColumn, endColumn } = event.selection;
        if (startLineNumber === endLineNumber && startColumn === endColumn) {
          announce(`Cursor at line ${startLineNumber}, column ${startColumn}`, 'polite');
        } else {
          announce(`Selected from line ${startLineNumber}, column ${startColumn} to line ${endLineNumber}, column ${endColumn}`, 'polite');
        }
      }
    });

    // Focus handlers
    editor.onDidFocusEditorWidget(() => {
      setIsFocused(true);
      if (screenReader) {
        announce('Code editor focused', 'polite');
      }
    });

    editor.onDidBlurEditorWidget(() => {
      setIsFocused(false);
      if (screenReader) {
        announce('Code editor focus lost', 'polite');
      }
    });

    // Keyboard event handler for accessibility
    editor.onKeyDown((event) => {
      // Announce common keyboard shortcuts for screen readers
      if (screenReader && event.ctrlKey) {
        let shortcut = '';
        switch (event.keyCode) {
          case monacoRef.current.KeyCode.KeyS:
            shortcut = 'Save';
            break;
          case monacoRef.current.KeyCode.KeyA:
            shortcut = 'Select all';
            break;
          case monacoRef.current.KeyCode.KeyZ:
            shortcut = event.shiftKey ? 'Redo' : 'Undo';
            break;
          case monacoRef.current.KeyCode.KeyC:
            shortcut = 'Copy';
            break;
          case monacoRef.current.KeyCode.KeyV:
            shortcut = 'Paste';
            break;
          case monacoRef.current.KeyCode.KeyX:
            shortcut = 'Cut';
            break;
          default:
            // No shortcut for this key
            break;
        }
        
        if (shortcut) {
          setTimeout(() => announce(shortcut, 'polite'), 100);
        }
      }
    });

    // Model change handler (language switching)
    editor.onDidChangeModel((event) => {
      const language = event.newModel?.getLanguageId() || 'javascript';
      setLocalLanguage(language);
      
      if (screenReader) {
        announce(`Language changed to ${language}`, 'polite');
      }
    });
  }, [connected, onCodeChange, sendCodeChange, screenReader, announce]);

  /**
   * Handle external content changes from other users
   * 
   * Updates the editor content when receiving changes from Socket.io
   */
  useEffect(() => {
    if (codeContent !== localContent && codeContent !== lastSyncedContentRef.current) {
      isLocalChangeRef.current = true;
      
      if (editorRef.current) {
        editorRef.current.setValue(codeContent);
        setLocalContent(codeContent);
        lastSyncedContentRef.current = codeContent;
        setHasUnsavedChanges(false);
        
        if (screenReader) {
          announce('Code updated by another user', 'polite');
        }
      }
    }
  }, [codeContent, localContent, screenReader, announce]);

  /**
   * Handle language changes from other users
   */
  useEffect(() => {
    if (codeLanguage !== localLanguage && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current?.editor.setModelLanguage(model, codeLanguage);
        setLocalLanguage(codeLanguage);
        
        if (screenReader) {
          announce(`Language changed to ${codeLanguage}`, 'polite');
        }
      }
    }
  }, [codeLanguage, localLanguage, screenReader, announce]);

  /**
   * Handle keyboard navigation for accessibility
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isFocused || !keyboardNavigation) return;

      // Handle special accessibility shortcuts
      switch (event.key) {
        case 'F6':
          // Focus editor
          event.preventDefault();
          editorRef.current?.focus();
          break;
        case 'Escape':
          // Clear selection
          if (editorRef.current) {
            const position = editorRef.current.getPosition();
            editorRef.current.setSelection({
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });
          }
          break;
        default:
          // No special handling for this key
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, keyboardNavigation, setupEventListeners]);

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
    
    return `Code editor: ${lines} lines, ${characters} characters, ${words} words. Language: ${localLanguage}. ${hasUnsavedChanges ? 'Unsaved changes.' : 'All changes saved.'}`;
  };

  /**
   * Handle language change
   */
  const handleLanguageChange = (newLanguage) => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, newLanguage);
        setLocalLanguage(newLanguage);
        
        // Send language change to server
        if (connected && onCodeChange) {
          const cursor = editorRef.current.getPosition();
          sendCodeChange(localContent, newLanguage, cursor);
        }
        
        if (screenReader) {
          announce(`Language changed to ${newLanguage}`, 'polite');
        }
      }
    }
  };

  /**
   * Handle editor focus
   */
  const handleFocus = () => {
    editorRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <label 
              htmlFor="language-select" 
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Language:
            </label>
            <select
              id="language-select"
              value={localLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="input text-sm py-1 px-2"
              aria-describedby="language-help"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="yaml">YAML</option>
              <option value="markdown">Markdown</option>
              <option value="sql">SQL</option>
              <option value="plaintext">Plain Text</option>
            </select>
            <p id="language-help" className="sr-only">
              Select the programming language for syntax highlighting
            </p>
          </div>

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
        </div>

        {/* Editor Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleFocus}
            className="btn btn-outline text-sm py-1 px-3"
            aria-label="Focus code editor"
          >
            Focus Editor
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={localLanguage}
          value={localContent}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            // Accessibility options
            accessibilitySupport: screenReader ? 'on' : 'auto',
            readOnly: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            
            // Keyboard navigation
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: true,
            
            // Visual accessibility
            fontSize: screenReader ? 16 : 14,
            lineHeight: screenReader ? 1.6 : 1.2,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            
            // Focus and selection
            selectOnLineNumbers: true,
            automaticLayout: true,
            
            // Additional accessibility
            cursorBlinking: 'blink',
            cursorSmoothCaretAnimation: true,
            renderWhitespace: 'selection',
            renderControlCharacters: true,
            renderIndentGuides: true,
            highlightActiveIndentGuide: true,
            
            // Screen reader support
            ariaLabel: 'Code editor for collaborative programming',
            ariaDescription: getEditorStatus(),
          }}
        />

        {/* Screen Reader Status */}
        <div 
          className="sr-only" 
          aria-live="polite" 
          aria-atomic="true"
          id="editor-status"
        >
          {getEditorStatus()}
        </div>

        {/* Focus Trap for Keyboard Navigation */}
        {keyboardNavigation && (
          <div 
            className="absolute inset-0 pointer-events-none"
            tabIndex={-1}
            onFocus={handleFocus}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Editor Footer */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Line {cursorPosition.line}, Column {cursorPosition.column}</span>
          <span>{localContent.split('\n').length} lines</span>
          <span>{localContent.length} characters</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>Language: {localLanguage}</span>
          {participants && (
            <span>{Object.keys(participants).length} participants</span>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      {keyboardNavigation && (
        <div className="sr-only" id="keyboard-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>F6: Focus code editor</li>
            <li>Escape: Clear selection</li>
            <li>Ctrl+S: Save (auto-saved)</li>
            <li>Ctrl+A: Select all</li>
            <li>Ctrl+Z: Undo</li>
            <li>Ctrl+Y: Redo</li>
            <li>Ctrl+C: Copy</li>
            <li>Ctrl+V: Paste</li>
            <li>Ctrl+X: Cut</li>
            <li>Ctrl+F: Find</li>
            <li>Ctrl+H: Replace</li>
            <li>Ctrl+G: Go to line</li>
            <li>Ctrl+/: Toggle comment</li>
            <li>Alt+Up/Down: Move line up/down</li>
            <li>Shift+Alt+Up/Down: Copy line up/down</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;