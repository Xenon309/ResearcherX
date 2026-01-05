import React, { useState, useEffect } from 'react';
import { Plus, Layout, Trash2, Edit2, Check, X } from 'lucide-react';
import { Workspace } from './types';
import { WorkspaceView } from './components/WorkspaceView';
import { DriveSync } from './components/DriveSync';

const LOCAL_STORAGE_KEY = 'researcherx_workspaces_v2';

const App: React.FC = () => {
  // 1. Initialize from LocalStorage
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
    // Default initial state if nothing saved
    return [{
      id: '1',
      name: 'Thesis: AI Ethics',
      createdAt: Date.now(),
      papers: [],
      notes: [],
      draft: '',
      chatSessions: {},
      discoveryState: {
        query: '',
        results: []
      }
    }];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // 2. Auto-save to LocalStorage on any change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspaces));
  }, [workspaces]);

  // Ensure active workspace is valid after load
  useEffect(() => {
    if (workspaces.length > 0 && !workspaces.find(w => w.id === activeWorkspaceId)) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  const handleAddWorkspace = () => {
    const newWorkspace: Workspace = {
      id: crypto.randomUUID(),
      name: `New Project ${workspaces.length + 1}`,
      createdAt: Date.now(),
      papers: [],
      notes: [],
      draft: '',
      chatSessions: {},
      discoveryState: {
        query: '',
        results: []
      }
    };
    setWorkspaces([...workspaces, newWorkspace]);
    setActiveWorkspaceId(newWorkspace.id);
  };

  const handleDeleteWorkspace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (workspaces.length === 1) return; // Prevent deleting last workspace
    
    const newWorkspaces = workspaces.filter(w => w.id !== id);
    setWorkspaces(newWorkspaces);
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId(newWorkspaces[0].id);
    }
  };

  const startEditing = (ws: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(ws.id);
    setEditName(ws.name);
  };

  const saveEditing = () => {
    if (editingId) {
      const updated = workspaces.map(w => w.id === editingId ? { ...w, name: editName } : w);
      setWorkspaces(updated);
      setEditingId(null);
      setEditName('');
    }
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditName('');
  };

  const handleUpdateWorkspace = (updated: Workspace) => {
    setWorkspaces(workspaces.map(w => w.id === updated.id ? updated : w));
  };

  // Called when importing from Drive
  const handleCloudImport = (importedWorkspaces: Workspace[]) => {
      setWorkspaces(importedWorkspaces);
      if (importedWorkspaces.length > 0) {
          setActiveWorkspaceId(importedWorkspaces[0].id);
      }
  };

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Sidebar - Workspaces */}
      <div className="w-64 bg-slate-900 flex flex-col border-r border-slate-800">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">ResearcherX</h1>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Workspaces</div>
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => {
                if (editingId !== ws.id) setActiveWorkspaceId(ws.id);
              }}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                activeWorkspaceId === ws.id 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              {editingId === ws.id ? (
                <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-2 py-1 rounded border border-blue-500 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button onClick={saveEditing} className="p-1 hover:text-green-400">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={cancelEditing} className="p-1 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="truncate text-sm font-medium">{ws.name}</span>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startEditing(ws, e)}
                      className="p-1 hover:text-blue-400 transition-colors mr-1"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {workspaces.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                        className="p-1 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          
          <button
            onClick={handleAddWorkspace}
            className="w-full mt-4 flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-dashed border-slate-700 hover:border-slate-500"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-4">
           {/* Drive Sync Component */}
           <DriveSync workspaces={workspaces} onImport={handleCloudImport} />
           
           <div className="text-xs text-slate-500 text-center">
              v1.1.0 • Auto-save enabled
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-slate-50 text-slate-900 overflow-hidden relative">
        {activeWorkspace ? (
          <WorkspaceView 
            key={activeWorkspace.id} 
            workspace={activeWorkspace} 
            onUpdateWorkspace={handleUpdateWorkspace} 
          />
        ) : (
          <div className="flex items-center justify-center h-full">Select a workspace</div>
        )}
      </div>
    </div>
  );
};

export default App;