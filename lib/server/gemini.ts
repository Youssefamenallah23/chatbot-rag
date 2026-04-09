import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getGeminiApiKey,
  getGeminiDocumentModel,
  getGeminiEmbeddingModel,
} from "./env";

let cachedGenAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!cachedGenAI) {
    cachedGenAI = new GoogleGenerativeAI(getGeminiApiKey());
  }
  return cachedGenAI;
}

export async function embedText(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: getGeminiEmbeddingModel() });
  const response = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
  });
  return response.embedding.values;
}

export async function extractDocumentText({
  base64Data,
  mimeType,
}: {
  base64Data: string;
  mimeType: string;
}): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: getGeminiDocumentModel() });
  const extractionResult = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Extract ALL text from this document verbatim. Preserve formatting and special characters.",
          },
          {
            inlineData: { data: base64Data, mimeType },
          },
        ],
      },
    ],
  });
  return extractionResult.response.text();
}

