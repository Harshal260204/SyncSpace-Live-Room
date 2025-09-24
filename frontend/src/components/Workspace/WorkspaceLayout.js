/**
 * Workspace Layout Component
 * 
 * Main workspace layout with:
 * - Responsive grid layout for all workspace components
 * - Full accessibility support (ARIA labels, keyboard navigation)
 * - Real-time layout state management
 * - Screen reader support and focus management
 * - Layout persistence and customization
 */

import React, { useState, useRef, useCallback } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useSocket } from '../../contexts/SocketContext';

// Import workspace components
import CodeEditor from './CodeEditor';
import NotesEditor from './NotesEditor';
import CanvasDrawing from './CanvasDrawing';
import ChatPanel from './ChatPanel';
import ParticipantsList from './ParticipantsList';
import ActivityFeed from './ActivityFeed';
import WorkspaceTabs from './WorkspaceTabs';

/**
 * Workspace Layout Component
 * 
 * Main layout component that orchestrates all workspace features
 * Provides responsive grid layout with comprehensive accessibility
 */
const WorkspaceLayout = ({ 
  roomId, 
  roomData, 
  participants, 
  activities,
  onRoomUpdate,
  onParticipantsUpdate,
  onActivitiesUpdate 
}) => {
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { connected } = useSocket();

  // Layout state
  const [layout, setLayout] = useState({
    // Grid layout configuration
    grid: {
      columns: 12,
      rows: 8,
      gap: 4
    },
    // Component positions and sizes
    components: {
      codeEditor: { x: 0, y: 0, width: 6, height: 4, visible: true },
      notesEditor: { x: 6, y: 0, width: 6, height: 4, visible: true },
      canvasDrawing: { x: 0, y: 4, width: 6, height: 4, visible: true },
      chatPanel: { x: 6, y: 4, width: 3, height: 4, visible: true },
      participantsList: { x: 9, y: 4, width: 3, height: 2, visible: true },
      activityFeed: { x: 9, y: 6, width: 3, height: 2, visible: true }
    },
    // Layout mode
    mode: 'grid', // 'grid', 'tabs', 'split'
    // Active tab (for tab mode)
    activeTab: 'code'
  });

  // Local state
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const layoutRef = useRef(null);
  const componentRefs = useRef({});

  /**
   * Get component position and size
   */
  const getComponentStyle = (componentId) => {
    const component = layout.components[componentId];
    if (!component || !component.visible) return { display: 'none' };

    const { x, y, width, height } = component;

    return {
      gridColumn: `${x + 1} / ${x + width + 1}`,
      gridRow: `${y + 1} / ${y + height + 1}`,
      display: 'flex',
      flexDirection: 'column'
    };
  };


  /**
   * Handle layout mode change
   */
  const handleLayoutModeChange = useCallback((mode) => {
    setLayout(prev => ({ ...prev, mode }));
    
    if (screenReader) {
      announce(`Layout mode changed to ${mode}`, 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((tab) => {
    setLayout(prev => ({ ...prev, activeTab: tab.id }));
    
    if (screenReader) {
      announce(`Switched to ${tab.name} tab`, 'polite');
    }
  }, [screenReader, announce]);


  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event) => {
    if (!keyboardNavigation) return;

    switch (event.key) {
      case '1':
        event.preventDefault();
        handleLayoutModeChange('grid');
        break;
      case '2':
        event.preventDefault();
        handleLayoutModeChange('tabs');
        break;
      case '3':
        event.preventDefault();
        handleLayoutModeChange('split');
        break;
      case 'Tab':
        // Let default tab behavior work
        break;
      case 'Escape':
        event.preventDefault();
        if (isResizing) {
          setIsResizing(false);
        }
        if (isDragging) {
          setIsDragging(false);
        }
        break;
      default:
        // No action needed for other keys
        break;
    }
  }, [keyboardNavigation, handleLayoutModeChange, isResizing, isDragging]);


  /**
   * Get layout status for screen readers
   */
  const getLayoutStatus = () => {
    const visibleComponents = Object.values(layout.components).filter(c => c.visible).length;
    const totalComponents = Object.keys(layout.components).length;
    const activeTabName = layout.mode === 'tabs' ? layout.activeTab : 'None';
    
    return `Workspace layout: ${layout.mode} mode, ${visibleComponents} of ${totalComponents} components visible, active tab: ${activeTabName}. ${connected ? 'Connected' : 'Disconnected'}.`;
  };

  /**
   * Get tabs configuration
   */
  const getTabsConfig = () => {
    return [
      {
        id: 'code',
        name: 'Code Editor',
        type: 'code',
        closable: false,
        renamable: true,
        reorderable: true,
        badge: roomData?.code ? 'Modified' : null
      },
      {
        id: 'notes',
        name: 'Notes',
        type: 'notes',
        closable: false,
        renamable: true,
        reorderable: true,
        badge: roomData?.notes ? 'Modified' : null
      },
      {
        id: 'canvas',
        name: 'Canvas',
        type: 'canvas',
        closable: false,
        renamable: true,
        reorderable: true,
        badge: roomData?.canvas ? 'Modified' : null
      },
      {
        id: 'chat',
        name: 'Chat',
        type: 'chat',
        closable: false,
        renamable: true,
        reorderable: true,
        badge: roomData?.chat?.length || 0
      },
      {
        id: 'participants',
        name: 'Participants',
        type: 'participants',
        closable: false,
        renamable: true,
        reorderable: true,
        badge: Object.keys(participants).length
      },
      {
        id: 'activity',
        name: 'Activity',
        type: 'activity',
        closable: false,
        renamable: true,
        reorderable: true,
        badge: activities.length
      }
    ];
  };

  /**
   * Render component based on layout mode
   */
  const renderComponent = (componentId) => {
    const component = layout.components[componentId];
    if (!component || !component.visible) return null;

    const commonProps = {
      roomId,
      roomData,
      participants,
      activities,
      onRoomUpdate,
      onParticipantsUpdate,
      onActivitiesUpdate
    };

    switch (componentId) {
      case 'codeEditor':
        return <CodeEditor {...commonProps} />;
      case 'notesEditor':
        return <NotesEditor {...commonProps} />;
      case 'canvasDrawing':
        return <CanvasDrawing {...commonProps} />;
      case 'chatPanel':
        return <ChatPanel {...commonProps} />;
      case 'participantsList':
        return <ParticipantsList {...commonProps} />;
      case 'activityFeed':
        return <ActivityFeed {...commonProps} />;
      default:
        return null;
    }
  };

  /**
   * Render tab content
   */
  const renderTabContent = () => {
    const activeTab = layout.activeTab;
    
    switch (activeTab) {
      case 'code':
        return <CodeEditor roomId={roomId} roomData={roomData} onRoomUpdate={onRoomUpdate} />;
      case 'notes':
        return <NotesEditor roomId={roomId} roomData={roomData} onRoomUpdate={onRoomUpdate} />;
      case 'canvas':
        return <CanvasDrawing roomId={roomId} roomData={roomData} onRoomUpdate={onRoomUpdate} />;
      case 'chat':
        return <ChatPanel roomId={roomId} roomData={roomData} participants={participants} onRoomUpdate={onRoomUpdate} />;
      case 'participants':
        return <ParticipantsList participants={participants} />;
      case 'activity':
        return <ActivityFeed activities={activities} />;
      default:
        return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Select a tab to view content</div>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Workspace Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {roomData?.name || 'Workspace'}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Object.keys(participants).length} participants
          </span>
        </div>

        {/* Layout Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleLayoutModeChange('grid')}
            className={`btn ${layout.mode === 'grid' ? 'btn-primary' : 'btn-outline'} text-sm py-1 px-2`}
            aria-label="Grid layout mode"
          >
            Grid
          </button>
          <button
            onClick={() => handleLayoutModeChange('tabs')}
            className={`btn ${layout.mode === 'tabs' ? 'btn-primary' : 'btn-outline'} text-sm py-1 px-2`}
            aria-label="Tabs layout mode"
          >
            Tabs
          </button>
          <button
            onClick={() => handleLayoutModeChange('split')}
            className={`btn ${layout.mode === 'split' ? 'btn-primary' : 'btn-outline'} text-sm py-1 px-2`}
            aria-label="Split layout mode"
          >
            Split
          </button>
        </div>
      </div>

      {/* Workspace Content */}
      <div 
        ref={layoutRef}
        className="flex-1 overflow-hidden min-h-0"
        role="main"
        aria-label="Workspace content"
        aria-describedby="workspace-help"
      >
        {layout.mode === 'tabs' ? (
          <div className="h-full flex flex-col min-h-0">
            {/* Tabs */}
            <div className="flex-shrink-0">
              <WorkspaceTabs
                tabs={getTabsConfig()}
                activeTab={getTabsConfig().find(tab => tab.id === layout.activeTab)}
                onTabChange={handleTabChange}
              />
            </div>
            
            {/* Tab Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              {renderTabContent()}
            </div>
          </div>
        ) : (
          <div 
            className="h-full grid gap-2 sm:gap-4 p-2 sm:p-4 min-h-0 overflow-auto"
            style={{
              gridTemplateColumns: `repeat(${layout.grid.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${layout.grid.rows}, minmax(0, 1fr))`
            }}
          >
            {/* Code Editor */}
            <div
              ref={(el) => {
                if (el) componentRefs.current.codeEditor = el;
              }}
              style={getComponentStyle('codeEditor')}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {renderComponent('codeEditor')}
            </div>

            {/* Notes Editor */}
            <div
              ref={(el) => {
                if (el) componentRefs.current.notesEditor = el;
              }}
              style={getComponentStyle('notesEditor')}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {renderComponent('notesEditor')}
            </div>

            {/* Canvas Drawing */}
            <div
              ref={(el) => {
                if (el) componentRefs.current.canvasDrawing = el;
              }}
              style={getComponentStyle('canvasDrawing')}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {renderComponent('canvasDrawing')}
            </div>

            {/* Chat Panel */}
            <div
              ref={(el) => {
                if (el) componentRefs.current.chatPanel = el;
              }}
              style={getComponentStyle('chatPanel')}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {renderComponent('chatPanel')}
            </div>

            {/* Participants List */}
            <div
              ref={(el) => {
                if (el) componentRefs.current.participantsList = el;
              }}
              style={getComponentStyle('participantsList')}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {renderComponent('participantsList')}
            </div>

            {/* Activity Feed */}
            <div
              ref={(el) => {
                if (el) componentRefs.current.activityFeed = el;
              }}
              style={getComponentStyle('activityFeed')}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {renderComponent('activityFeed')}
            </div>
          </div>
        )}
      </div>

      {/* Screen Reader Status */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="workspace-status"
      >
        {getLayoutStatus()}
      </div>

      {/* Keyboard Shortcuts Help */}
      {keyboardNavigation && (
        <div className="sr-only" id="workspace-keyboard-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>1: Grid layout mode</li>
            <li>2: Tabs layout mode</li>
            <li>3: Split layout mode</li>
            <li>Tab: Navigate between elements</li>
            <li>Escape: Cancel resize/drag</li>
            <li>Click: Select component</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default WorkspaceLayout;
