import React, { useState } from 'react';
import { Search, Library, PenTool } from 'lucide-react';
import { Workspace, Paper, ViewMode, ChatMessage } from '../types';
import { DiscoveryPanel } from './DiscoveryPanel';
import { LibraryPanel } from './LibraryPanel';
import { PaperChat } from './PaperChat';
import { WritingPanel } from './WritingPanel';

interface WorkspaceViewProps {
  workspace: Workspace;
  onUpdateWorkspace: (updated: Workspace) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ workspace, onUpdateWorkspace }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('discover');
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  const handleSavePaper = (paper: Paper) => {
    const updatedPapers = [...workspace.papers, paper];
    onUpdateWorkspace({ ...workspace, papers: updatedPapers });
  };

  const handleRemovePaper = (paperId: string) => {
    const updatedPapers = workspace.papers.filter(p => p.id !== paperId);
    onUpdateWorkspace({ ...workspace, papers: updatedPapers });
  };

  const handleSendMessage = (paperId: string, message: ChatMessage) => {
    const currentSessions = workspace.chatSessions || {};
    const paperChat = currentSessions[paperId] || [];
    const updatedSessions = {
      ...currentSessions,
      [paperId]: [...paperChat, message]
    };
    onUpdateWorkspace({ ...workspace, chatSessions: updatedSessions });
  };

  const handleSaveNote = (paperId: string, content: string) => {
    const newNote = {
      id: crypto.randomUUID(),
      paperId,
      content,
      createdAt: Date.now()
    };
    onUpdateWorkspace({ ...workspace, notes: [...workspace.notes, newNote] });
  };

  const handleUpdateDraft = (text: string) => {
    onUpdateWorkspace({ ...workspace, draft: text });
  };

  const handleUpdatePaperContent = (paperId: string, content: string) => {
      const updatedPapers = workspace.papers.map(p => 
        p.id === paperId ? { ...p, fullTextContent: content } : p
      );
      onUpdateWorkspace({ ...workspace, papers: updatedPapers });
  };

  // Handle updates to the discovery search results so they persist
  const handleUpdateDiscoveryState = (query: string, results: Paper[]) => {
    onUpdateWorkspace({
        ...workspace,
        discoveryState: {
            query,
            results
        }
    });
  };

  const selectedPaper = workspace.papers.find(p => p.id === selectedPaperId);

  // Render content based on view state
  const renderContent = () => {
    if (selectedPaperId && selectedPaper) {
      return (
        <PaperChat
          paper={selectedPaper}
          messages={workspace.chatSessions[selectedPaperId] || []}
          notes={workspace.notes.filter(n => n.paperId === selectedPaperId)}
          onBack={() => setSelectedPaperId(null)}
          onSendMessage={handleSendMessage}
          onSaveNote={handleSaveNote}
          onUpdatePaperContent={handleUpdatePaperContent}
        />
      );
    }

    switch (viewMode) {
      case 'discover':
        return (
          <DiscoveryPanel 
            onSavePaper={handleSavePaper} 
            savedPaperIds={new Set(workspace.papers.map(p => p.id))} 
            onUpdateDraft={handleUpdateDraft}
            initialQuery={workspace.discoveryState?.query}
            initialResults={workspace.discoveryState?.results}
            onUpdateDiscoveryState={handleUpdateDiscoveryState}
          />
        );
      case 'library':
        return (
          <LibraryPanel 
            papers={workspace.papers} 
            onSelectPaper={(p) => setSelectedPaperId(p.id)}
            onRemovePaper={handleRemovePaper}
          />
        );
      case 'write':
        return (
          <WritingPanel 
            draft={workspace.draft} 
            onUpdateDraft={handleUpdateDraft} 
            onUpdateDiscoveryState={handleUpdateDiscoveryState}
          />
        );
      default:
        return <div>Unknown View</div>;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Workspace Navigation */}
      {!selectedPaperId && (
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-center space-x-8">
          <button
            onClick={() => setViewMode('discover')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'discover' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4" /> Discover
          </button>
          <button
            onClick={() => setViewMode('library')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'library' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Library className="w-4 h-4" /> Library <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-xs">{workspace.papers.length}</span>
          </button>
          <button
            onClick={() => setViewMode('write')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'write' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4" /> Write
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {renderContent()}
      </div>
    </div>
  );
};