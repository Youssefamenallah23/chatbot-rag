import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import "dotenv/config";

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GEMINI_API_KEY,
} = process.env;

if (
  !ASTRA_DB_NAMESPACE ||
  !ASTRA_DB_COLLECTION ||
  !ASTRA_DB_ENDPOINT ||
  !ASTRA_DB_APPLICATION_TOKEN ||
  !GEMINI_API_KEY
) {
  throw new Error(
    "Missing env vars. Required: ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, GEMINI_API_KEY"
  );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

const defaultUrls = [
  "https://hyperise.com/blog/how-to-integrate-chatbot-in-website",
  "https://trengo.com/blog/integrate-chat-on-website",
];

function getSeedUrls(): string[] {
  const args = process.argv.slice(2).filter((a) => a.trim().length > 0);
  if (args.length > 0) return args;

  const fromEnv = process.env.SEED_URLS;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return defaultUrls;
}

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const createCollection = async (
  similarityMetric: SimilarityMetric = "dot_product"
) => {
  const res = await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: 768,
      metric: similarityMetric,
    },
    // Don't fail if the collection already exists with the same options.
    checkExists: false,
  });
  console.log(res);
};

const loadSampleData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION);
  const urls = getSeedUrls();
  console.log(`Seeding ${urls.length} URL(s)...`);

  for (const url of urls) {
    const content = await scrapePage(url);
    const chunks = await splitter.splitText(content);
    for (const chunk of chunks) {
      try {
        const embeddingResponse = await embeddingModel.embedContent({
          // Use embeddingModel (text-embedding-004)
          content: { role: "user", parts: [{ text: chunk }] },
        });
        const vectorEmbedding = embeddingResponse.embedding.values; // Extract embedding vector

        console.log(
          `Generated embedding for chunk: ${chunk.substring(0, 50)}...`
        );

        const res = await collection.insertOne({
          pageContent: chunk,
          $vector: vectorEmbedding,
          metadata: { source: url },
        });
        console.log(`Chunk stored in DB: ${chunk.substring(0, 50)}...`);
      } catch (error) {
        console.error("Error generating or storing embedding:", error);
      }
    }
  }
  console.log("Sample data loaded successfully!");
};

const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true,
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
    },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => {
        // Your evaluation logic here
        return document.body.innerText;
      });
      await browser.close();
      return result;
    },
  });

  return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
};

createCollection()
  .then(() => loadSampleData())
  .finally(async () => {
    await client.close();
  });
