import { getRagCollection, type RagDoc } from "./astra";
import { embedText } from "./gemini";
import { optionalEnv } from "./env";

export type RagChunk = {
  text: string;
  source?: string;
  similarity?: number;
};

function clampString(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "…";
}

export async function retrieveRagChunks(query: string): Promise<RagChunk[]> {
  const collection = await getRagCollection();
  if (!collection) return [];

  const vector = await embedText(query);
  const limit = Number(optionalEnv("RAG_TOP_K") ?? "8");

  const cursor = collection.find(
    { $vector: { $exists: true } },
    {
      sort: { $vector: vector },
      limit: Number.isFinite(limit) && limit > 0 ? limit : 8,
      includeSimilarity: true,
      projection: {
        pageContent: 1,
        metadata: 1,
      },
    }
  );

  const docs = (await cursor.toArray()) as Array<RagDoc & { $similarity?: number }>;

  return docs
    .filter((d) => typeof d.pageContent === "string" && d.pageContent.trim().length > 0)
    .map((d) => ({
      text: d.pageContent,
      source: d.metadata?.source,
      similarity: d.$similarity,
    }));
}

export async function buildRagContext(query: string): Promise<{
  context: string;
  chunks: RagChunk[];
}> {
  const chunks = await retrieveRagChunks(query);
  if (chunks.length === 0) return { context: "", chunks };

  const maxChunkChars = Number(optionalEnv("RAG_MAX_CHUNK_CHARS") ?? "900");
  const maxContextChars = Number(optionalEnv("RAG_MAX_CONTEXT_CHARS") ?? "4500");

  const parts: string[] = [];
  for (const chunk of chunks) {
    const header = chunk.source ? `Source: ${chunk.source}` : "Source: (unknown)";
    parts.push(`${header}\n${clampString(chunk.text, maxChunkChars)}`);
  }

  const joined = parts.join("\n\n---\n\n");
  return { context: clampString(joined, maxContextChars), chunks };
}

