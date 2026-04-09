import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { NextResponse } from "next/server";
import { getRagCollection } from "@/lib/server/astra";
import { embedText } from "@/lib/server/gemini";
import { scrapeUrlToText } from "@/lib/server/scrape";

export const runtime = "nodejs";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

type IngestUrlRequest =
  | { url: string }
  | { urls: string[] };

export async function POST(req: Request) {
  try {
    const collection = await getRagCollection();
    if (!collection) {
      return new Response("Astra DB is not configured", { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as IngestUrlRequest | null;
    const urls =
      body && "urls" in body && Array.isArray(body.urls)
        ? body.urls
        : body && "url" in body && typeof body.url === "string"
          ? [body.url]
          : [];

    if (urls.length === 0) {
      return new Response("Missing `url` or `urls`", { status: 400 });
    }

    if (urls.length > 5) {
      return new Response("Too many URLs (max 5 per request)", { status: 413 });
    }

    const results: Array<{
      url: string;
      chunksInserted?: number;
      error?: string;
    }> = [];

    for (const url of urls) {
      try {
        const scraped = await scrapeUrlToText(url);
        const chunks = await splitter.splitText(scraped.text);

        let inserted = 0;
        for (const chunk of chunks) {
          const embedding = await embedText(chunk);
          await collection.insertOne({
            pageContent: chunk,
            $vector: embedding,
            metadata: {
              source: scraped.url,
              type: "url_ingest",
              uploadedAt: new Date().toISOString(),
            },
          });
          inserted++;
        }

        results.push({ url: scraped.url, chunksInserted: inserted });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ url, error: message });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Ingest URL error:", error);
    const message =
      error instanceof Error && error.message.startsWith("Missing required environment variable")
        ? error.message
        : "Ingest failed";
    return new Response(message, { status: 500 });
  }
}

