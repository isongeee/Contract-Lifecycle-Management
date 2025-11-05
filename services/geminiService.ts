
import { GoogleGenAI, Type } from "@google/genai";
import type { Clause } from '../types';

// FIX: API_KEY should be retrieved from process.env.API_KEY
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const summarizeContractRisk = async (contractText: string): Promise<string> => {
  if (!API_KEY) return "API Key not configured. Please check your environment variables.";
  try {
    const response = await ai.models.generateContent({
      // FIX: Use 'gemini-2.5-flash' for basic text tasks per guidelines
      model: 'gemini-2.5-flash',
      // FIX: Use `contents` for a simple text prompt
      contents: `Analyze the following contract text for potential risks from our perspective as the service provider. Focus on areas like liability, indemnification, payment terms, and termination clauses. Provide a concise, bulleted summary of the key risks. Contract Text: \n\n${contractText}`,
       config: {
        temperature: 0.2,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error summarizing contract risk:", error);
    return "An error occurred while analyzing the contract. Please try again.";
  }
};

export const extractClauses = async (contractText: string): Promise<Clause[]> => {
  if (!API_KEY) {
      console.warn("API Key not configured.");
      return [];
  }
  try {
    const response = await ai.models.generateContent({
      // FIX: Use 'gemini-2.5-flash' for basic text tasks per guidelines
      model: "gemini-2.5-flash",
      // FIX: Use `contents` for a simple text prompt
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
            // FIX: "id" is required per schema, but we will generate it client-side for reliability
            required: ["title", "content", "summary"],
          },
        },
      },
    });
    
    // FIX: Safely parse the JSON response text
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
