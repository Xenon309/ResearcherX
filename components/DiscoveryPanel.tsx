import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, FileText, Check, Upload, FileUp, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { Paper, LoadingState } from '../types';
import { searchPapers, enrichPaperWithWeb, analyzeUploadedDraft } from '../services/geminiService';

interface DiscoveryPanelProps {
  onSavePaper: (paper: Paper) => void;
  savedPaperIds: Set<string>;
  onUpdateDraft: (text: string) => void;
  initialQuery?: string;
  initialResults?: Paper[];
  onUpdateDiscoveryState: (query: string, results: Paper[]) => void;
}

export const DiscoveryPanel: React.FC<DiscoveryPanelProps> = ({ 
    onSavePaper, 
    savedPaperIds, 
    onUpdateDraft,
    initialQuery = '',
    initialResults = [],
    onUpdateDiscoveryState
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'upload'>('search');
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Paper[]>(initialResults);
  const [loading, setLoading] = useState<LoadingState>({ status: 'idle' });
  const [processingId, setProcessingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with prop changes (if workspace changes)
  useEffect(() => {
    setQuery(initialQuery);
    setResults(initialResults);
  }, [initialQuery, initialResults]);

  const updateResults = (newQuery: string, newPapers: Paper[]) => {
      setQuery(newQuery);
      setResults(newPapers);
      onUpdateDiscoveryState(newQuery, newPapers);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading({ status: 'loading' });
    try {
      const papers = await searchPapers(query);
      updateResults(query, papers);
      setLoading({ status: 'success' });
    } catch (err) {
      setLoading({ status: 'error', message: 'Failed to fetch papers. Please try again.' });
    }
  };

  const handleSave = async (paper: Paper) => {
    setProcessingId(paper.id);
    try {
      // Use enrichPaperWithWeb instead of simple summarize
      const analysis = await enrichPaperWithWeb(paper);
      const enrichedPaper = { ...paper, ...analysis, isSaved: true };
      onSavePaper(enrichedPaper);
    } catch (e) {
      console.error("Failed to enrich on save", e);
      onSavePaper({ ...paper, isSaved: true });
    } finally {
      setProcessingId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.md')) {
        setLoading({ status: 'error', message: 'Invalid file type. Please upload PDF, TXT, or MD.' });
        return;
    }

    setLoading({ status: 'loading', message: 'Importing draft & finding sources...' });

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        
        try {
          // Analyze draft
          const analysis = await analyzeUploadedDraft(base64Data, file.type || 'text/plain');
          
          // 1. Update Draft
          onUpdateDraft(analysis.fullText);

          // 2. Search for papers
          const papers = await searchPapers(analysis.searchQuery);
          
          // 3. Update State (Persist)
          updateResults(analysis.searchQuery, papers);
          
          setLoading({ status: 'success' });
          setActiveTab('search');
          alert("Draft imported to Editor! Showing relevant papers below.");
          
        } catch (apiError) {
          console.error(apiError);
          setLoading({ status: 'error', message: 'Failed to analyze the draft. Please try again.' });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setLoading({ status: 'error', message: 'Error reading file.' });
    } finally {
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Add Research</h2>
        <div className="flex justify-center gap-4 mb-8">
            <button
                onClick={() => setActiveTab('search')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                    activeTab === 'search' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
                Search Topic
            </button>
            <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                    activeTab === 'upload' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
                Upload Draft
            </button>
        </div>

        {activeTab === 'search' ? (
            <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter a research topic (e.g., 'Transformer architecture')"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <Button 
                    type="submit" 
                    className="absolute right-2 top-2" 
                    size="sm"
                    isLoading={loading.status === 'loading'}
                >
                    Search
                </Button>
            </form>
        ) : (
            <div className="max-w-xl mx-auto">
                <div 
                    className="border-2 border-dashed border-slate-300 rounded-xl p-10 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept=".pdf,.txt,.md"
                        onChange={handleFileUpload}
                    />
                    <div className="flex flex-col items-center">
                        <div className="bg-blue-100 p-4 rounded-full mb-4">
                            <FileUp className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">Upload Your Draft</h3>
                        <p className="text-sm text-slate-500 mb-4 text-center max-w-xs">
                           Upload your paper (PDF/TXT) to import it into the Editor. We'll also find relevant sources for you.
                        </p>
                        <p className="text-xs text-slate-400">Perfect for checking scientific writing rules & structure.</p>
                    </div>
                </div>
            </div>
        )}
      </div>

      {loading.status === 'loading' && activeTab === 'upload' && (
          <div className="text-center p-4 bg-blue-50 text-blue-800 rounded-lg mb-6">
              <span className="animate-pulse">Importing text and finding relevant papers...</span>
          </div>
      )}

      {loading.status === 'error' && (
        <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg mb-6">
          {loading.message}
        </div>
      )}

      {/* Results Section */}
      {(results.length > 0 || (activeTab === 'search' && loading.status === 'success')) && (
          <div className="space-y-4">
            {results.length > 0 && (
                <div className="text-sm text-slate-500 mb-2 flex justify-between items-center">
                   <span>Found {results.length} relevant papers:</span>
                   <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Sorted by Impact & Recency</span>
                </div>
            )}

            {results.map((paper) => {
              const isSaved = savedPaperIds.has(paper.id);
              const isProcessing = processingId === paper.id;

              return (
                <div key={paper.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1 leading-tight">{paper.title}</h3>
                      <div className="text-sm text-slate-500 mb-3 flex items-center flex-wrap gap-2">
                        <span className="font-medium text-slate-700">{paper.authors[0]} et al.</span>
                        <span>•</span>
                        <span>{paper.year}</span>
                        <span>•</span>
                        <span className="italic">{paper.venue}</span>
                      </div>
                      <p className="text-slate-600 text-sm line-clamp-3 mb-4">{paper.abstract}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {isSaved ? (
                        <span className="flex items-center text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-full">
                          <Check className="w-4 h-4 mr-1.5" />
                          In Library
                        </span>
                      ) : (
                        <Button 
                          onClick={() => handleSave(paper)} 
                          variant="secondary"
                          size="sm"
                          isLoading={isProcessing}
                          className="group-hover:border-blue-500 group-hover:text-blue-600"
                        >
                          {isProcessing ? (
                             <span className="flex items-center">
                               <Sparkles className="w-3 h-3 mr-2 animate-spin" />
                               Enriching...
                             </span>
                          ) : (
                             <span className="flex items-center">
                               <Plus className="w-4 h-4 mr-1.5" />
                               Add to Library
                             </span>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {results.length === 0 && loading.status === 'success' && activeTab === 'search' && (
              <div className="text-center text-slate-500 py-10">
                No papers found. Try a broader topic.
              </div>
            )}
          </div>
      )}
    </div>
  );
};