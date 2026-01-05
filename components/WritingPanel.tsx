import React, { useState, useRef } from 'react';
import { PenTool, CheckCircle, AlertCircle, Sparkles, Trophy, BookOpen, Globe, RefreshCw, ChevronDown, ChevronRight, MessageSquareWarning, Upload, Check, ArrowRightLeft } from 'lucide-react';
import { Button } from './Button';
import { analyzeThesisDraft, DetailedAnalysis, analyzeUploadedDraft, searchPapers } from '../services/geminiService';
import { Paper } from '../types';

interface WritingPanelProps {
  draft: string;
  onUpdateDraft: (text: string) => void;
  onUpdateDiscoveryState: (query: string, results: Paper[]) => void;
}

export const WritingPanel: React.FC<WritingPanelProps> = ({ draft, onUpdateDraft, onUpdateDiscoveryState }) => {
  const [analysis, setAnalysis] = useState<DetailedAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing section-by-section...");
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeepAnalysis = async () => {
    if (draft.length < 50) return;
    setLoading(true);
    setLoadingMessage("Analyzing section-by-section...");
    try {
      const result = await analyzeThesisDraft(draft);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRewrite = (original: string, replacement: string) => {
      // Basic normalization to handle potential whitespace differences from model output
      const normalizedDraft = draft.replace(/\r\n/g, "\n");
      const normalizedOriginal = original.replace(/\r\n/g, "\n");
      
      if (normalizedDraft.includes(normalizedOriginal)) {
          const newDraft = normalizedDraft.replace(normalizedOriginal, replacement);
          onUpdateDraft(newDraft);
          alert("Change applied successfully!");
      } else {
          // Fallback: try to find it by stripping whitespace roughly if exact match fails
          // For now, let's just alert.
          alert("Could not find exact match for this section in the current draft. It may have been edited already.");
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.md')) {
        alert('Invalid file type. Please upload PDF, TXT, or MD.');
        return;
    }

    setLoading(true);
    setLoadingMessage("Importing draft, finding sources & running analysis...");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        
        try {
            // 1. Analyze Draft text (Extract & Get Search Query)
            const draftAnalysis = await analyzeUploadedDraft(base64Data, file.type || 'text/plain');
            
            // Update the editor text
            onUpdateDraft(draftAnalysis.fullText);

            // 2. Search for papers (Populate Discover Tab)
            // We do this in parallel with the thesis analysis to save time, or sequentially.
            // Let's do sequentially to ensure stable state updates.
            const papers = await searchPapers(draftAnalysis.searchQuery);
            onUpdateDiscoveryState(draftAnalysis.searchQuery, papers);

            // 3. Run Deep Scientific Analysis on the new text
            const deepAnalysis = await analyzeThesisDraft(draftAnalysis.fullText);
            setAnalysis(deepAnalysis);
            
        } catch (err) {
            console.error(err);
            alert("Failed to process draft completely. Please try again.");
        } finally {
            setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setLoading(false);
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Editor Area */}
      <div className="flex-1 flex flex-col border-r border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-700">
            <PenTool className="w-5 h-5" />
            <span className="font-semibold">Draft Editor</span>
          </div>
          <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".pdf,.txt,.md"
                onChange={handleFileUpload}
            />
            <Button 
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                isLoading={loading && loadingMessage.startsWith("Importing")}
            >
                <Upload className="w-4 h-4 mr-2" />
                Import Draft
            </Button>
            <Button 
                onClick={handleDeepAnalysis} 
                disabled={draft.length < 50 || loading}
                isLoading={loading && !loadingMessage.startsWith("Importing")}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
                <Sparkles className="w-4 h-4 mr-2" />
                Scientific Analysis
            </Button>
          </div>
        </div>
        <textarea
          className="flex-1 w-full p-8 resize-none focus:outline-none font-serif text-lg leading-relaxed text-slate-800"
          placeholder="Paste or write your thesis draft here..."
          value={draft}
          onChange={(e) => onUpdateDraft(e.target.value)}
        />
        <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 border-t border-slate-200 text-right">
          {draft.split(/\s+/).filter(w => w.length > 0).length} words
        </div>
      </div>

      {/* Feedback Sidebar */}
      <div className="w-[450px] bg-slate-50 flex flex-col overflow-hidden border-l border-slate-200 shadow-xl">
        <div className="p-4 border-b border-slate-200 font-semibold text-slate-700 bg-white flex items-center gap-2 shadow-sm z-10">
           <BookOpen className="w-4 h-4 text-indigo-600"/>
           Scientific Review Report
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {!analysis ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
              {loading ? (
                <div className="space-y-4">
                  <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto"></div>
                  <p className="text-sm font-medium text-slate-700">{loadingMessage}</p>
                  <p className="text-xs text-slate-400">Verifying claims on the web & checking scientific standards</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                    <Globe className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-slate-900 font-medium mb-2">Deep Scientific Analysis</h3>
                  <p className="text-sm px-2 mb-6">
                    Paste your draft or upload a file to run our deep analysis. We'll check:
                  </p>
                  <ul className="text-sm text-left space-y-2 max-w-[240px] mx-auto text-slate-600">
                    <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500"/> Scientific structure</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500"/> Word choice optimization</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500"/> Web-based claim verification</li>
                  </ul>
                </>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-6 animate-fadeIn pb-10">
                {/* Score Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 ${
                            analysis.overallScore >= 8 ? 'bg-green-50 text-green-700 border-green-100' :
                            analysis.overallScore >= 5 ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                            'bg-red-50 text-red-700 border-red-100'
                            }`}>
                            {analysis.overallScore}
                            </div>
                            <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Paper Quality</div>
                            <div className="text-sm font-bold text-slate-900">Scientific Readiness</div>
                            </div>
                        </div>
                        <Trophy className={`w-6 h-6 ${analysis.overallScore >= 8 ? 'text-yellow-400' : 'text-slate-200'}`} />
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {analysis.executiveSummary}
                    </p>
                </div>

                <div className="border-t border-slate-200 my-4"></div>

                {/* Sections Accordion */}
                <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 pl-1">Section Analysis</h3>
                <div className="space-y-3">
                    {analysis.sections.map((section, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <button 
                                onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                            >
                                <span className="font-bold text-slate-800 text-sm">{section.sectionName}</span>
                                {expandedSection === idx ? <ChevronDown className="w-4 h-4 text-slate-500"/> : <ChevronRight className="w-4 h-4 text-slate-500"/>}
                            </button>
                            
                            {expandedSection === idx && (
                                <div className="p-4 space-y-5">
                                    {/* Critique */}
                                    <div>
                                        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase mb-2">
                                            <MessageSquareWarning className="w-3 h-3 text-orange-500"/> Critique
                                        </h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">{section.critique}</p>
                                    </div>

                                    {/* Rules Violated */}
                                    {section.scientificRulesViolated.length > 0 && (
                                        <div>
                                            <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase mb-2">
                                                <AlertCircle className="w-3 h-3 text-red-500"/> Standards Check
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {section.scientificRulesViolated.map((rule, i) => (
                                                    <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100">
                                                        {rule}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Web Validation */}
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <h4 className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase mb-2">
                                            <Globe className="w-3 h-3"/> Web Reality Check
                                        </h4>
                                        <p className="text-sm text-blue-900 leading-relaxed">
                                            {section.webValidation}
                                        </p>
                                    </div>

                                    {/* Words */}
                                    {section.wordChoiceSuggestions.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Better Words</h4>
                                            <p className="text-sm text-slate-600 italic">
                                                Try using: {section.wordChoiceSuggestions.join(", ")}
                                            </p>
                                        </div>
                                    )}

                                    {/* Rewrite */}
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="flex items-center gap-2 text-xs font-bold text-green-800 uppercase">
                                                <RefreshCw className="w-3 h-3"/> Suggested Rewrite
                                            </h4>
                                            <Button 
                                                size="sm" 
                                                className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2"
                                                onClick={() => handleApplyRewrite(section.originalText, section.rewriteSuggestion)}
                                            >
                                                <ArrowRightLeft className="w-3 h-3 mr-1" />
                                                Apply Change
                                            </Button>
                                        </div>
                                        <p className="text-sm text-green-900 leading-relaxed font-serif italic">
                                            "{section.rewriteSuggestion}"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};