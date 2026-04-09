import { NextResponse } from "next/server";
import { getRagCollection } from "@/lib/server/astra";

export const runtime = "nodejs";

export async function GET() {
  try {
    const collection = await getRagCollection();
    if (!collection) {
      return new Response("Astra DB is not configured", { status: 500 });
    }

    const result = await collection
      .find(
        { "metadata.type": "file_upload" },
        { projection: { "metadata.source": 1, "metadata.uploadedAt": 1 } }
      )
      .toArray();

    const byFilename = new Map<string, string | undefined>();
    for (const doc of result) {
      const filename = doc?.metadata?.source;
      if (!filename) continue;
      if (!byFilename.has(filename)) {
        byFilename.set(filename, doc?.metadata?.uploadedAt);
      }
    }

    const uniqueFiles = [...byFilename.entries()].map(([filename, uploadedAt]) => ({
      filename,
      uploadedAt,
    }));

    uniqueFiles.sort((a, b) => {
      const ta = a.uploadedAt ? Date.parse(a.uploadedAt) : 0;
      const tb = b.uploadedAt ? Date.parse(b.uploadedAt) : 0;
      return tb - ta;
    });

    return NextResponse.json(uniqueFiles);
  } catch (error) {
    console.error("File list error:", error);
    return new Response("Failed to retrieve files", { status: 500 });
  }
}
