import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { NextResponse } from "next/server";
import { getRagCollection } from "@/lib/server/astra";
import { embedText, extractDocumentText } from "@/lib/server/gemini";
import { optionalEnv } from "@/lib/server/env";

export const runtime = "nodejs";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "txt":
      return "text/plain";
    case "md":
      return "text/markdown";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

export async function POST(req: Request) {
  try {
    const collection = await getRagCollection();
    if (!collection) {
      return new Response("Astra DB is not configured", { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response("No file found", { status: 400 });
    }

    const allowedExtensions = new Set(["pdf", "txt", "docx", "md"]);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.has(ext)) {
      return new Response("Unsupported file type", { status: 415 });
    }

    const maxUploadMb = Number(optionalEnv("MAX_UPLOAD_MB") ?? "10");
    if (Number.isFinite(maxUploadMb) && maxUploadMb > 0) {
      const maxBytes = maxUploadMb * 1024 * 1024;
      if (file.size > maxBytes) {
        return new Response(`File too large (max ${maxUploadMb} MB)`, {
          status: 413,
        });
      }
    }

    // Convert file to base64
    const fileData = await file.arrayBuffer();
    const base64Data = Buffer.from(fileData).toString("base64");

    // Extract text from document
    const mimeType = file.type?.trim() ? file.type : guessMimeType(file.name);
    const documentText = await extractDocumentText({
      base64Data,
      mimeType,
    });

    // Process and store chunks
    const chunks = await splitter.splitText(documentText ?? "");
    if (chunks.length === 0) {
      return new Response("No text extracted from document", { status: 422 });
    }

    for (const chunk of chunks) {
      const embedding = await embedText(chunk);

      await collection.insertOne({
        pageContent: chunk,
        $vector: embedding,
        metadata: {
          source: file.name,
          type: "file_upload",
          uploadedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${chunks.length} chunks from ${file.name}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error && error.message.startsWith("Missing required environment variable")
        ? error.message
        : "Document processing failed";
    return new Response(message, { status: 500 });
  }
}
