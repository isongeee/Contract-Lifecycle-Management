

import { GoogleGenAI, Type } from "@google/genai";
import type { Clause } from '../types';

// Use API_KEY from process.env.API_KEY
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const summarizeContractRisk = async (contractText: string): Promise<string> => {
  if (!API_KEY) return "API Key not configured. Please check your environment variables.";
  try {
    const response = await ai.models.generateContent({
      // Use 'gemini-2.5-flash' for basic text tasks per guidelines
      model: 'gemini-2.5-flash',
      // Use `contents` for a simple text prompt
      contents: `Analyze the following contract text for potential risks from our perspective as the service provider. Focus on areas like liability, indemnification, payment terms, and termination clauses. Provide a concise, bulleted summary of the key risks. Contract Text: \n\n${contractText}`,
       config: {
        temperature: 0.2,
      },
    });
    // Correctly get text from response.text
    return response.text;
  } catch (error) {
    console.error("Error summarizing contract risk:", error);
    return "An error occurred while analyzing the contract. Please try again.";
  }
};

export const summarizePerformanceMetrics = async (contractText: string): Promise<string> => {
  if (!API_KEY) return "API Key not configured.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a contract manager. Analyze the following contract text to identify key performance indicators (KPIs), service level agreements (SLAs), and critical obligations. Provide a concise, bulleted summary of these performance-related items. If no specific metrics are found, summarize the main obligations. Contract Text: \n\n${contractText}`,
      config: {
        temperature: 0.3,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error summarizing performance metrics:", error);
    return "An error occurred while analyzing the contract's performance metrics.";
  }
};


export const extractClauses = async (contractText: string): Promise<Clause[]> => {
  if (!API_KEY) {
      console.warn("API Key not configured.");
      return [];
  }
  try {
    const response = await ai.models.generateContent({
      // Use 'gemini-2.5-flash' for basic text tasks per guidelines
      model: "gemini-2.5-flash",
      // Use `contents` for a simple text prompt
      contents: `Analyze the following contract text. Extract the key clauses listed in the response schema. For each clause, provide its title, the full text content, and a one-sentence summary. If a clause is not present, omit it from the output. Contract Text: \n\n${contractText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'A unique identifier for the clause, e.g., clause-1' },
              title: { type: Type.STRING, description: "The title of the clause (e.g., 'Limitation of Liability')." },
              content: { type: Type.STRING, description: "The full, verbatim text of the clause." },
              summary: { type: Type.STRING, description: "A concise, one-sentence summary of the clause's meaning." },
            },
            // "id" is required per schema, but we will generate it client-side for reliability
            required: ["title", "content", "summary"],
          },
        },
      },
    });
    
    // Safely parse the JSON response text
    const jsonStr = response.text.trim();
    const clauses = JSON.parse(jsonStr) as Omit<Clause, 'id'>[];

    // Add unique IDs if the model didn't provide them reliably
    return clauses.map((c, index) => ({
      ...c,
      id: `clause-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Error extracting clauses:", error);
    return [];
  }
};

export const generateRenewalDraft = async (previousContractText: string, userPrompt: string): Promise<string> => {
  if (!API_KEY) return "API Key not configured. Please check your environment variables.";
  try {
    const response = await ai.models.generateContent({
      // Use 'gemini-2.5-pro' for complex drafting tasks
      model: 'gemini-2.5-pro',
      contents: `You are an expert contract lawyer. Your task is to draft a renewal document.
      Based on the provided "PREVIOUS CONTRACT TEXT" and the "USER INSTRUCTIONS", generate a complete and professional new contract draft.
      Ensure the new draft is a standalone document, incorporating all necessary clauses from the previous version, modified according to the user's instructions.
      Do not just output the changed clauses; provide the full contract text.

      PREVIOUS CONTRACT TEXT:
      ---
      ${previousContractText}
      ---
      
      USER INSTRUCTIONS FOR RENEWAL:
      ---
      ${userPrompt}
      ---
      
      NEW DRAFT:`,
       config: {
        temperature: 0.4,
      },
    });
    // Correctly get text from response.text
    return response.text;
  } catch (error) {
    console.error("Error generating renewal draft:", error);
    return "An error occurred while generating the contract draft. Please try again.";
  }
};

export const suggestCommentReply = async (contractClause: string, commentThread: {author: string, content: string}[]): Promise<string> => {
    if (!API_KEY) return "API Key not configured.";
    try {
        const fullPrompt = `You are a senior legal counsel. Given the following contract clause and a comment thread about it, suggest a professional and constructive reply to the last comment.
        
        CONTRACT CLAUSE (for context):
        ---
        ${contractClause}
        ---

        COMMENT THREAD:
        ---
        ${commentThread.map(c => `${c.author}: ${c.content}`).join('\n')}
        ---

        SUGGESTED REPLY (as a helpful assistant, address the last comment):
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: fullPrompt,
            config: { temperature: 0.5 },
        });

        return response.text;
    } catch (error) {
        console.error("Error suggesting comment reply:", error);
        return "An error occurred while generating a suggestion.";
    }
};

export const draftInitialContract = async (contractDetails: {
  contractType: string;
  counterpartyName: string;
  effectiveDate: string;
  value: number;
}): Promise<string> => {
  if (!API_KEY) return "API Key not configured.";
  
  const { contractType, counterpartyName, effectiveDate, value } = contractDetails;
  
  const prompt = `You are an expert contract lawyer. Your task is to draft a simple, standard contract based on the following details. The draft should be a complete document with common clauses appropriate for the contract type.

  - Contract Type: ${contractType}
  - Our Counterparty: ${counterpartyName}
  - Effective Date: ${effectiveDate}
  - Total Value: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}

  Please include standard clauses for:
  1.  Scope of Services/Products
  2.  Term and Termination
  3.  Payment Terms
  4.  Confidentiality
  5.  Limitation of Liability
  
  Generate the full contract text.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Good for drafting
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error drafting initial contract:", error);
    return "An error occurred while drafting the contract. Please try again or enter the text manually.";
  }
};
