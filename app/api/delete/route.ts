import { NextResponse } from "next/server";
import { getRagCollection } from "@/lib/server/astra";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) return new Response("Filename required", { status: 400 });

    const collection = await getRagCollection();
    if (!collection) {
      return new Response("Astra DB is not configured", { status: 500 });
    }

    const result = await collection.deleteMany({
      "metadata.source": filename,
    });

    if (result.deletedCount === 0) {
      return new Response("File not found", { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return new Response("Delete failed", { status: 500 });
  }
}
