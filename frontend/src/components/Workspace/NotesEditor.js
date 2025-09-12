/**
 * Notes Editor Component
 * 
 * Collaborative notes editor with rich text support
 * Supports real-time collaboration and markdown
 */

import React, { useState, useEffect, useRef } from 'react';

const NotesEditor = ({ onNoteChange, participants, initialNotes = '' }) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef(null);

  // Handle notes changes
  const handleNotesChange = (e) => {
    const value = e.target.value;
    setNotes(value);
    if (onNoteChange) {
      onNoteChange(value);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [notes]);

  // Convert markdown to HTML for preview
  const renderMarkdown = (text) => {
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/gim, '<br>');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPreview(false)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                !isPreview
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ✏️ Edit
            </button>
            
            <button
              onClick={() => setIsPreview(true)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                isPreview
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              👁️ Preview
            </button>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {notes.length} characters
          </div>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex-1 p-4">
        {isPreview ? (
          <div
            className="h-full w-full p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(notes) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={handleNotesChange}
            placeholder="Start writing your notes here... Use Markdown for formatting:

# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
`Code text`

[Link text](https://example.com)

- List item 1
- List item 2
  - Nested item"
            className="w-full h-full p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            style={{ minHeight: '400px' }}
          />
        )}
      </div>
    </div>
  );
};

export default NotesEditor;
