import { DataAPIClient, type VectorDoc } from "@datastax/astra-db-ts";
import { getAstraEnv } from "./env";

export type RagDoc = VectorDoc & {
  pageContent: string;
  metadata?: {
    source?: string;
    type?: string;
    uploadedAt?: string;
  };
};

let cachedClient: DataAPIClient | null = null;

function getClient(token: string): DataAPIClient {
  if (!cachedClient) cachedClient = new DataAPIClient(token);
  return cachedClient;
}

export function getAstraDb() {
  const astra = getAstraEnv();
  if (!astra) return null;

  const client = getClient(astra.token);
  return client.db(astra.endpoint, { namespace: astra.namespace });
}

export async function getRagCollection() {
  const astra = getAstraEnv();
  const db = getAstraDb();
  if (!astra || !db) return null;
  return db.collection<RagDoc>(astra.collection);
}

