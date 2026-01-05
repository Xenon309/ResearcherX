export interface Note {
  id: string;
  paperId: string;
  content: string;
  createdAt: number;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: string;
  venue: string;
  abstract: string;
  link?: string;
  summary?: string;
  keyFindings?: string[];
  fullTextContent?: string; // Simulated content for chat context
  isSaved: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  papers: Paper[];
  notes: Note[];
  draft: string;
  chatSessions: Record<string, ChatMessage[]>; // paperId -> messages
  discoveryState?: {
    query: string;
    results: Paper[];
  };
}

export type ViewMode = 'discover' | 'library' | 'paper' | 'write';

export interface LoadingState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}