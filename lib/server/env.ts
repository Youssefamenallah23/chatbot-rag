type AstraEnv = {
  namespace: string;
  collection: string;
  endpoint: string;
  token: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return readEnv(name);
}

export function getGeminiApiKey(): string {
  return requireEnv("GEMINI_API_KEY");
}

export function getGeminiChatModel(): string {
  return optionalEnv("GEMINI_CHAT_MODEL") ?? "gemini-2.0-flash";
}

export function getGeminiEmbeddingModel(): string {
  return optionalEnv("GEMINI_EMBEDDING_MODEL") ?? "text-embedding-004";
}

export function getGeminiDocumentModel(): string {
  return optionalEnv("GEMINI_DOCUMENT_MODEL") ?? "gemini-2.0-pro-exp";
}

export function getAstraEnv(): AstraEnv | null {
  const namespace = readEnv("ASTRA_DB_NAMESPACE");
  const collection = readEnv("ASTRA_DB_COLLECTION");
  const endpoint = readEnv("ASTRA_DB_ENDPOINT");
  const token = readEnv("ASTRA_DB_APPLICATION_TOKEN");

  if (!namespace || !collection || !endpoint || !token) return null;

  return { namespace, collection, endpoint, token };
}

