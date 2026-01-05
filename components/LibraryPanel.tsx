import React from 'react';
import { BookOpen, Calendar, Users, Trash2 } from 'lucide-react';
import { Paper } from '../types';
import { Button } from './Button';

interface LibraryPanelProps {
  papers: Paper[];
  onSelectPaper: (paper: Paper) => void;
  onRemovePaper: (id: string) => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ papers, onSelectPaper, onRemovePaper }) => {
  if (papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <BookOpen className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="text-xl font-medium text-slate-900 mb-2">Library is Empty</h3>
        <p>Go to the Discovery tab to find and save papers.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Library ({papers.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.map((paper) => (
          <div 
            key={paper.id} 
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow group cursor-pointer"
            onClick={() => onSelectPaper(paper)}
          >
            <div className="p-5 flex-1">
              <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                {paper.title}
              </h3>
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {paper.authors[0]}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {paper.year}
                </span>
              </div>
              
              {paper.summary ? (
                <div className="text-sm text-slate-600 line-clamp-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1 text-xs uppercase">Summary</span>
                  {paper.summary}
                </div>
              ) : (
                <p className="text-sm text-slate-500 line-clamp-4 italic">
                  {paper.abstract}
                </p>
              )}
            </div>
            
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-medium text-blue-600 group-hover:underline">
                Open & Chat
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePaper(paper.id);
                }}
                className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                title="Remove from library"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};