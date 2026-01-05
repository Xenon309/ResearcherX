import { GoogleGenAI, Type } from "@google/genai";
import { Paper, ChatMessage } from "../types";

// Helper to get client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Discover Papers
export const searchPapers = async (topic: string): Promise<Paper[]> => {
  const ai = getClient();
  
  const prompt = `
    You are a senior academic research assistant.
    The user is researching the topic: "${topic}".
    
    TASK:
    1. Analyze the topic and identify 3-4 diverse sub-themes or research directions to ensure comprehensive coverage.
    2. For each sub-theme, retrieve the most influential and relevant academic papers.
    3. RANKING RULES:
       - Priority 1: High Citation Count (Impactful, seminal works)
       - Priority 2: Recency (Prefer papers from the last 5-7 years, unless it is a classic foundational paper)
    4. Generate a list of at least 10 high-quality papers.
    5. Ensure the results act as a "Google Scholar" simulation: authoritative sources, real titles, correct authors.

    Return the result as a JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              authors: { type: Type.ARRAY, items: { type: Type.STRING } },
              year: { type: Type.STRING },
              venue: { type: Type.STRING },
              abstract: { type: Type.STRING },
              link: { type: Type.STRING },
            },
            required: ['title', 'authors', 'year', 'venue', 'abstract']
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    
    return data.map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      isSaved: false,
      summary: "",
      keyFindings: []
    }));
  } catch (error) {
    console.error("Error searching papers:", error);
    throw error;
  }
};

// 2. Summarize Paper (Basic - used for uploads)
export const summarizePaper = async (paper: Paper): Promise<{ summary: string; keyFindings: string[] }> => {
  const ai = getClient();

  const contentToAnalyze = paper.fullTextContent || paper.abstract;
  
  const prompt = `
    Analyze the following academic paper content (or abstract).
    Provide a concise summary (max 3 sentences) and a list of 3-5 key findings.
    
    Content:
    Title: ${paper.title}
    ${contentToAnalyze}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['summary', 'keyFindings']
        }
      }
    });

    return JSON.parse(response.text || '{"summary": "", "keyFindings": []}');
  } catch (error) {
    console.error("Error summarizing paper:", error);
    return { summary: "Could not generate summary.", keyFindings: [] };
  }
};

// 2.5 Enrich Paper with Web Search (Used for "Add to Library")
export const enrichPaperWithWeb = async (paper: Paper): Promise<{ summary: string; keyFindings: string[]; fullTextContent: string }> => {
  const ai = getClient();
  const prompt = `
    You are a research assistant.
    Target Paper: "${paper.title}" by ${paper.authors[0]} (${paper.year}).
    Abstract: ${paper.abstract}

    GOAL: Create a comprehensive knowledge base for this paper to enable a chat bot to answer detailed questions.

    ACTIONS:
    1. Use Google Search to find specific details about this paper from valid academic sources or summaries:
       - Methodology (How did they do it?)
       - Datasets used (if any)
       - Quantitative Results (Numbers, metrics)
       - Critical reception or impact.
    
    OUTPUT:
    Return a JSON object with:
    - "summary": Concise 3-sentence summary.
    - "keyFindings": List of 3-5 distinct key contributions.
    - "enrichedContext": A detailed multi-paragraph text combining the abstract with the new details found from the web. This will act as the "full text" for the chat.
  `;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Pro model for better search/synthesis
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
            enrichedContext: { type: Type.STRING }
          },
          required: ['summary', 'keyFindings', 'enrichedContext']
        }
      }
    });
    
    const data = JSON.parse(response.text || "{}");
    return {
        summary: data.summary || "Summary not available.",
        keyFindings: data.keyFindings || [],
        fullTextContent: data.enrichedContext || paper.abstract // Fallback to abstract if search fails
    };

  } catch (error) {
      console.error("Enrichment failed", error);
      // Fallback to basic summary if search fails
      const basic = await summarizePaper(paper);
      return { ...basic, fullTextContent: paper.abstract };
  }
};

// 3. Process Uploaded Paper
export const parseUploadedPaper = async (base64Data: string, mimeType: string): Promise<Paper> => {
  const ai = getClient();

  const prompt = `
    Analyze this uploaded document. It is likely an academic paper.
    Extract the following information in JSON format:
    1. Title of the paper
    2. Authors (list of names)
    3. Year of publication (if available, else use current year)
    4. Venue (journal/conference, if available, else "Uploaded Document")
    5. Abstract (text)
    6. Full Text Content (extract the readable text from the document for further analysis)
    7. A concise summary (max 3 sentences)
    8. Key findings (list of 3-5 points)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            authors: { type: Type.ARRAY, items: { type: Type.STRING } },
            year: { type: Type.STRING },
            venue: { type: Type.STRING },
            abstract: { type: Type.STRING },
            fullTextContent: { type: Type.STRING },
            summary: { type: Type.STRING },
            keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['title', 'authors', 'year', 'abstract', 'fullTextContent', 'summary', 'keyFindings']
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    return {
      id: crypto.randomUUID(),
      title: data.title || "Untitled Document",
      authors: data.authors || ["Unknown Author"],
      year: data.year || new Date().getFullYear().toString(),
      venue: data.venue || "Uploaded File",
      abstract: data.abstract || "No abstract extracted.",
      link: "#",
      summary: data.summary || "",
      keyFindings: data.keyFindings || [],
      fullTextContent: data.fullTextContent || "",
      isSaved: true 
    };
  } catch (error) {
    console.error("Error parsing uploaded paper:", error);
    throw new Error("Failed to process the uploaded file.");
  }
};

// 4. Chat with Paper (Enhanced with Search)
export const chatWithPaper = async (
  paper: Paper,
  history: ChatMessage[],
  newMessage: string
): Promise<string> => {
  const ai = getClient();

  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: newMessage }]
  });

  const context = paper.fullTextContent 
    ? `Full Paper Content / Enriched Context: ${paper.fullTextContent}` 
    : `Abstract Only: ${paper.abstract}`;

  const systemInstruction = `
    You are a helpful research assistant. 
    You are answering questions about the academic paper titled "${paper.title}".
    
    CONTEXT PROVIDED:
    ${context}
    
    INSTRUCTIONS:
    1. Use the provided context to answer the user's question first.
    2. IMPORTANT: You have access to Google Search tools. 
       - If the user asks for specific details (like specific numbers, equations, implementation details, or recent citations) that are NOT in the context, YOU MUST USE THE GOOGLE SEARCH TOOL to find this information online.
       - Do not simply say "I don't have the full paper". Instead, say "Searching for details..." and use the tool.
    3. Keep answers concise, academic, and cite your source if it comes from the web.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Use Pro for tools
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }] // Enable search during chat
      }
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

export interface SectionAnalysis {
  sectionName: string;
  originalText: string;
  critique: string;
  scientificRulesViolated: string[];
  wordChoiceSuggestions: string[];
  webValidation: string;
  rewriteSuggestion: string;
}

export interface DetailedAnalysis {
  overallScore: number;
  executiveSummary: string;
  sections: SectionAnalysis[];
}

// 5. Deep Thesis Analysis
export const analyzeThesisDraft = async (draftText: string): Promise<DetailedAnalysis> => {
  const ai = getClient();
  
  if (!draftText || draftText.length < 50) {
      throw new Error("Draft too short");
  }

  const prompt = `
    Act as a World-Class Scientific Editor and Research Supervisor.
    Analyze the provided draft of an academic thesis/paper.
    
    Rules:
    - Active Voice, Simple Present Tense, No Contractions, No Puffery.
    - Check formatting and structure.

    TASK:
    Step 1: Segmentation (Abstract, Intro, etc.)
    Step 2: Section-by-Section Analysis (Standards, Web Verification, Word Choice, Rewriting)
    Step 3: Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        { text: prompt },
        { text: `DRAFT CONTENT:\n${draftText}` }
      ],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            executiveSummary: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sectionName: { type: Type.STRING },
                  originalText: { type: Type.STRING },
                  critique: { type: Type.STRING },
                  scientificRulesViolated: { type: Type.ARRAY, items: { type: Type.STRING } },
                  wordChoiceSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  webValidation: { type: Type.STRING },
                  rewriteSuggestion: { type: Type.STRING }
                },
                required: ['sectionName', 'originalText', 'critique', 'scientificRulesViolated', 'wordChoiceSuggestions', 'webValidation', 'rewriteSuggestion']
              }
            }
          },
          required: ['overallScore', 'executiveSummary', 'sections']
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Deep Analysis error:", error);
    return {
      overallScore: 0,
      executiveSummary: "Analysis failed.",
      sections: []
    };
  }
};

export const getWritingFeedback = async (draftText: string): Promise<any> => {
   return analyzeThesisDraft(draftText);
};

export const analyzeUploadedDraft = async (base64Data: string, mimeType: string): Promise<{ fullText: string; searchQuery: string }> => {
  const ai = getClient();
  const prompt = `
    This is a draft of an academic paper.
    1. Extract the FULL readable text content.
    2. Generate a comprehensive search query for related work.
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullText: { type: Type.STRING },
            searchQuery: { type: Type.STRING }
          },
          required: ['fullText', 'searchQuery']
        }
      }
    });

    return JSON.parse(response.text || '{"fullText": "", "searchQuery": ""}');
  } catch (error) {
    console.error("Error analyzing draft:", error);
    throw new Error("Failed to process the draft.");
  }
};