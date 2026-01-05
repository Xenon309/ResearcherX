import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, MessageSquare, StickyNote, ArrowLeft, Save, FileText, Globe } from 'lucide-react';
import { Paper, ChatMessage, Note } from '../types';
import { Button } from './Button';
import { chatWithPaper } from '../services/geminiService';

interface PaperChatProps {
  paper: Paper;
  messages: ChatMessage[];
  notes: Note[];
  onBack: () => void;
  onSendMessage: (paperId: string, message: ChatMessage) => void;
  onSaveNote: (paperId: string, content: string) => void;
  onUpdatePaperContent: (paperId: string, content: string) => void;
}

export const PaperChat: React.FC<PaperChatProps> = ({
  paper,
  messages,
  notes,
  onBack,
  onSendMessage,
  onSaveNote,
  onUpdatePaperContent
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [fullText, setFullText] = useState(paper.fullTextContent || '');
  const [showContentModal, setShowContentModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    onSendMessage(paper.id, userMsg);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await chatWithPaper(paper, messages, input);
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };
      onSendMessage(paper.id, aiMsg);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveTextContent = () => {
      onUpdatePaperContent(paper.id, fullText);
      setShowContentModal(false);
  };

  // Determine if we are using enriched context or user-provided content
  const isEnriched = paper.fullTextContent && paper.fullTextContent.length > 500 && !paper.fullTextContent.startsWith("Summary");
  const isAbstractOnly = !paper.fullTextContent || paper.fullTextContent.length < 500;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
        {/* Content Input Modal */}
        {showContentModal && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                    <h3 className="text-xl font-bold mb-2">Edit Paper Context</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        We automatically search the web for details, but you can paste the exact PDF text here for better accuracy.
                    </p>
                    <textarea 
                        className="w-full h-48 border rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-blue-500"
                        placeholder="Paste text here..."
                        value={fullText}
                        onChange={(e) => setFullText(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowContentModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveTextContent}>Save Context</Button>
                    </div>
                </div>
            </div>
        )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-slate-900 leading-tight max-w-xl truncate">
              {paper.title}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-xs text-slate-500">{paper.authors[0]} et al. • {paper.year}</span>
               {isEnriched ? (
                   <span className="flex items-center text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                       <Globe className="w-3 h-3 mr-1" /> Web Enriched
                   </span>
               ) : (
                   <span className="flex items-center text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100">
                       Abstract Only + Search
                   </span>
               )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowContentModal(true)}>
                <FileText className="w-4 h-4 mr-2" />
                {paper.fullTextContent ? 'Edit Context' : 'Paste Text'}
            </Button>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'chat' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4"/> Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'notes' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2"><StickyNote className="w-4 h-4"/> Notes ({notes.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Summary/Findings Static View */}
        <div className="w-1/3 bg-white border-r border-slate-200 p-6 overflow-y-auto hidden lg:block">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Abstract</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{paper.abstract}</p>
          </div>
          
          {paper.summary && (
            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-2">Extended Summary</h3>
              <p className="text-slate-700 text-sm">{paper.summary}</p>
            </div>
          )}

          {paper.keyFindings && paper.keyFindings.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Key Findings</h3>
              <ul className="space-y-2">
                {paper.keyFindings.map((finding, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-blue-500 font-bold">•</span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Chat/Notes Area */}
        <div className="flex-1 flex flex-col bg-slate-50 relative">
          {activeTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 && (
                  <div className="text-center mt-20 opacity-50">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-lg font-medium text-slate-600">Ask a question about this paper</p>
                    <p className="text-sm mb-4">"What is the main contribution?"</p>
                    
                    {isAbstractOnly && (
                        <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs">
                             <Globe className="w-3 h-3" />
                             I will use Google Search to find details not in the abstract.
                        </div>
                    )}
                  </div>
                )}
                
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] group relative ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm shadow-sm'
                    } p-4`}>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                      
                      {msg.role === 'model' && (
                        <button
                          onClick={() => onSaveNote(paper.id, msg.text)}
                          className="absolute -right-10 top-0 p-2 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all bg-white rounded-full shadow-sm border border-slate-100"
                          title="Save as Note"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={handleSend} className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isAbstractOnly ? "Ask specific details (AI will search web)..." : "Ask about methodology, results, or limitations..."}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-bold mb-4">Saved Notes</h3>
              {notes.length === 0 ? (
                <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                  <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notes yet.</p>
                  <p className="text-sm">Save interesting insights from the chat.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 shadow-sm relative group">
                      <p className="text-slate-800 text-sm whitespace-pre-wrap">{note.content}</p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-yellow-700 font-medium">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};