/**
 * Workspace Tabs Component
 * 
 * Tab-based workspace navigation with:
 * - Real-time tab management and switching
 * - Full accessibility support (ARIA labels, keyboard navigation)
 * - Tab state persistence and synchronization
 * - Screen reader support and focus management
 * - Tab actions and interactions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useSocket } from '../../contexts/SocketContext';

/**
 * Workspace Tabs Component
 * 
 * Manages workspace tabs with comprehensive accessibility
 * Includes tab switching, state management, and real-time updates
 */
const WorkspaceTabs = ({ 
  tabs = [], 
  activeTab, 
  onTabChange, 
  onTabClose, 
  onTabReorder,
  onTabRename 
}) => {
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { connected } = useSocket();

  // Local state
  const [isFocused, setIsFocused] = useState(false);
  const [draggedTab, setDraggedTab] = useState(null);
  const [renamingTab, setRenamingTab] = useState(null);
  const [newTabName, setNewTabName] = useState('');

  // Refs
  const tabsRef = useRef(null);
  const tabRefs = useRef({});
  const renameInputRef = useRef(null);

  /**
   * Get tab icon
   */
  const getTabIcon = (type) => {
    switch (type) {
      case 'code':
        return '💻';
      case 'notes':
        return '📝';
      case 'canvas':
        return '🎨';
      case 'chat':
        return '💬';
      case 'participants':
        return '👥';
      case 'activity':
        return '📊';
      default:
        return '📄';
    }
  };

  /**
   * Get tab color
   */
  const getTabColor = (type) => {
    switch (type) {
      case 'code':
        return 'text-blue-600 dark:text-blue-400';
      case 'notes':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'canvas':
        return 'text-purple-600 dark:text-purple-400';
      case 'chat':
        return 'text-indigo-600 dark:text-indigo-400';
      case 'participants':
        return 'text-green-600 dark:text-green-400';
      case 'activity':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  /**
   * Handle tab selection
   */
  const handleTabSelect = useCallback((tab) => {
    if (onTabChange) {
      onTabChange(tab);
    }
    
    if (screenReader) {
      announce(`Selected tab: ${tab.name}`, 'polite');
    }
  }, [onTabChange, screenReader, announce]);

  /**
   * Handle tab close
   */
  const handleTabClose = useCallback((tab, event) => {
    event.stopPropagation();
    
    if (onTabClose) {
      onTabClose(tab);
    }
    
    if (screenReader) {
      announce(`Closed tab: ${tab.name}`, 'polite');
    }
  }, [onTabClose, screenReader, announce]);

  /**
   * Handle tab rename start
   */
  const handleTabRenameStart = useCallback((tab, event) => {
    event.stopPropagation();
    setRenamingTab(tab);
    setNewTabName(tab.name);
    
    if (screenReader) {
      announce(`Renaming tab: ${tab.name}`, 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Handle tab rename confirm
   */
  const handleTabRenameConfirm = useCallback(() => {
    if (renamingTab && newTabName.trim() && onTabRename) {
      onTabRename(renamingTab, newTabName.trim());
    }
    
    setRenamingTab(null);
    setNewTabName('');
    
    if (screenReader) {
      announce(`Tab renamed to: ${newTabName}`, 'polite');
    }
  }, [renamingTab, newTabName, onTabRename, screenReader, announce]);

  /**
   * Handle tab rename cancel
   */
  const handleTabRenameCancel = useCallback(() => {
    setRenamingTab(null);
    setNewTabName('');
    
    if (screenReader) {
      announce('Tab rename cancelled', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event) => {
    if (!keyboardNavigation || !isFocused) return;

    const currentIndex = tabs.findIndex(tab => tab.id === activeTab?.id);

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (tabs[prevIndex]) {
          handleTabSelect(tabs[prevIndex]);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, tabs.length - 1);
        if (tabs[nextIndex]) {
          handleTabSelect(tabs[nextIndex]);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeTab) {
          handleTabSelect(activeTab);
        }
        break;
      case 'Delete':
        event.preventDefault();
        if (activeTab && activeTab.closable) {
          handleTabClose(activeTab, event);
        }
        break;
      case 'F2':
        event.preventDefault();
        if (activeTab && activeTab.renamable) {
          handleTabRenameStart(activeTab, event);
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (renamingTab) {
          handleTabRenameCancel();
        }
        break;
      default:
        // No action needed for other keys
        break;
    }
  }, [keyboardNavigation, isFocused, activeTab, tabs, handleTabSelect, handleTabClose, handleTabRenameStart, handleTabRenameCancel, renamingTab]);

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (screenReader) {
      announce('Workspace tabs focused', 'polite');
    }
  }, [screenReader, announce]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (screenReader) {
      announce('Workspace tabs focus lost', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Handle drag and drop
   */
  const handleDragStart = useCallback((tab, event) => {
    setDraggedTab(tab);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tab.id);
    
    if (screenReader) {
      announce(`Dragging tab: ${tab.name}`, 'polite');
    }
  }, [screenReader, announce]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    
    if (draggedTab && onTabReorder) {
      const targetTabId = event.dataTransfer.getData('text/plain');
      const targetTab = tabs.find(tab => tab.id === targetTabId);
      
      if (targetTab && targetTab.id !== draggedTab.id) {
        onTabReorder(draggedTab, targetTab);
        
        if (screenReader) {
          announce(`Moved tab ${draggedTab.name} to position of ${targetTab.name}`, 'polite');
        }
      }
    }
    
    setDraggedTab(null);
  }, [draggedTab, onTabReorder, tabs, screenReader, announce]);

  /**
   * Handle rename input keydown
   */
  const handleRenameKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        handleTabRenameConfirm();
        break;
      case 'Escape':
        event.preventDefault();
        handleTabRenameCancel();
        break;
      default:
        // No action needed for other keys
        break;
    }
  }, [handleTabRenameConfirm, handleTabRenameCancel]);

  /**
   * Get tabs status for screen readers
   */
  const getTabsStatus = () => {
    const activeTabName = activeTab ? activeTab.name : 'None';
    const totalTabs = tabs.length;
    const visibleTabs = tabs.filter(tab => !tab.hidden).length;
    
    return `Workspace tabs: ${activeTabName} active, ${visibleTabs} of ${totalTabs} visible. ${connected ? 'Connected' : 'Disconnected'}.`;
  };

  /**
   * Focus rename input when renaming starts
   */
  useEffect(() => {
    if (renamingTab && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingTab]);

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      {/* Tabs Container */}
      <div 
        ref={tabsRef}
        className="flex items-center space-x-1 min-w-0"
        tabIndex={0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="tablist"
        aria-label="Workspace tabs"
        aria-describedby="tabs-help"
      >
        {tabs.map((tab) => {
          const isActive = activeTab?.id === tab.id;
          const isRenaming = renamingTab?.id === tab.id;
          const isDragging = draggedTab?.id === tab.id;

          return (
            <div
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current[tab.id] = el;
              }}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-t-lg cursor-pointer transition-colors duration-200
                ${isActive 
                  ? 'bg-white dark:bg-gray-900 border-b-2 border-primary-500' 
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }
                ${isDragging ? 'opacity-50' : ''}
                ${tab.hidden ? 'hidden' : ''}
              `}
              onClick={() => handleTabSelect(tab)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTabSelect(tab);
                }
              }}
              onDragStart={(e) => handleDragStart(tab, e)}
              draggable={tab.reorderable}
              role="tab"
              tabIndex={0}
              aria-label={`${tab.name} tab${isActive ? ', active' : ''}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
            >
              {/* Tab Icon */}
              <span 
                className={`text-sm ${getTabColor(tab.type)}`}
                aria-label={`${tab.type} tab`}
              >
                {getTabIcon(tab.type)}
              </span>

              {/* Tab Name */}
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleTabRenameConfirm}
                  className="text-sm bg-transparent border-none outline-none min-w-0 flex-1"
                  aria-label={`Rename ${tab.name} tab`}
                />
              ) : (
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-32">
                  {tab.name}
                </span>
              )}

              {/* Tab Badge */}
              {tab.badge && (
                <span className="text-xs bg-primary-500 text-white rounded-full px-2 py-1 min-w-0">
                  {tab.badge}
                </span>
              )}

              {/* Tab Close Button */}
              {tab.closable && (
                <button
                  onClick={(e) => handleTabClose(tab, e)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                  aria-label={`Close ${tab.name} tab`}
                >
                  <span className="text-sm">×</span>
                </button>
              )}

              {/* Tab Rename Button */}
              {tab.renamable && !isRenaming && (
                <button
                  onClick={(e) => handleTabRenameStart(tab, e)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                  aria-label={`Rename ${tab.name} tab`}
                >
                  <span className="text-sm">✏️</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Tab Actions */}
      <div className="flex items-center space-x-1 ml-auto">
        {/* Add Tab Button */}
        <button
          onClick={() => {
            if (screenReader) {
              announce('Add new tab', 'polite');
            }
          }}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 p-1"
          aria-label="Add new tab"
        >
          <span className="text-sm">+</span>
        </button>

        {/* Tab Menu Button */}
        <button
          onClick={() => {
            if (screenReader) {
              announce('Tab menu', 'polite');
            }
          }}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 p-1"
          aria-label="Tab menu"
        >
          <span className="text-sm">⋮</span>
        </button>
      </div>

      {/* Screen Reader Status */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="tabs-status"
      >
        {getTabsStatus()}
      </div>

      {/* Keyboard Shortcuts Help */}
      {keyboardNavigation && (
        <div className="sr-only" id="tabs-keyboard-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>Arrow Left/Right: Navigate tabs</li>
            <li>Enter/Space: Select tab</li>
            <li>Delete: Close active tab</li>
            <li>F2: Rename active tab</li>
            <li>Escape: Cancel rename</li>
            <li>Tab: Navigate between elements</li>
            <li>Click: Select tab</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default WorkspaceTabs;
