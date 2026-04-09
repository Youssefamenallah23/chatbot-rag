"use client";

import { useChat } from "@ai-sdk/react";
import Bubble from "./_components/Bubble";
import LoadingBubble from "./_components/LoadingBubble";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UploadedFile = {
  filename: string;
  uploadedAt?: string;
};

function formatDate(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export default function Home() {
  const { status, messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isIngestingUrl, setIsIngestingUrl] = useState(false);
  const [urlToIngest, setUrlToIngest] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const noMessages = useMemo(() => messages.length === 0, [messages.length]);

  const fetchFiles = useCallback(async () => {
    try {
      setFilesLoading(true);
      const response = await fetch("/api/files");
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = (await response.json()) as UploadedFile[];
      setUploadedFiles(Array.isArray(data) ? data : []);
      setFileError(null);
    } catch (error) {
      console.error("File fetch error:", error);
      setFileError("Failed to load files");
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, status]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputEl = e.currentTarget;
      const file = inputEl.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      setIsUploading(true);
      setNotice(null);
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        await fetchFiles();
        setNotice({ type: "success", text: "File uploaded and indexed." });
      } catch (error) {
        console.error("Upload error:", error);
        setNotice({ type: "error", text: "File upload failed." });
      } finally {
        setIsUploading(false);
        inputEl.value = "";
      }
    },
    [fetchFiles]
  );

  const handleDelete = useCallback(async (filename: string) => {
    const ok = confirm(`Delete "${filename}"? This removes all indexed chunks for the file.`);
    if (!ok) return;

    setNotice(null);
    try {
      const response = await fetch(
        `/api/delete?filename=${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Delete failed");

      setUploadedFiles((prev) => prev.filter((f) => f.filename !== filename));
      setNotice({ type: "success", text: "File deleted." });
    } catch (error) {
      console.error("Delete error:", error);
      setNotice({ type: "error", text: "Delete failed." });
    }
  }, []);

  const handleIngestUrl = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const url = urlToIngest.trim();
      if (!url) return;

      setIsIngestingUrl(true);
      setNotice(null);
      try {
        const res = await fetch("/api/ingest-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) throw new Error("Ingest failed");

        setUrlToIngest("");
        await fetchFiles();
        setNotice({ type: "success", text: "URL ingested and indexed." });
      } catch (error) {
        console.error("Ingest URL error:", error);
        setNotice({ type: "error", text: "URL ingest failed." });
      } finally {
        setIsIngestingUrl(false);
      }
    },
    [fetchFiles, urlToIngest]
  );

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Chatbot RAG</h1>
            <p className="text-sm text-gray-600">
              Ask questions and ground answers in your uploaded documents.
            </p>
          </div>

          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm ${
              isUploading
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            <span>{isUploading ? "Uploading…" : "Upload file"}</span>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt,.docx,.md"
              disabled={isUploading}
            />
          </label>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Uploaded files</h2>
            <button
              type="button"
              onClick={() => void fetchFiles()}
              className="text-xs text-gray-600 hover:text-gray-900"
              disabled={filesLoading}
            >
              Refresh
            </button>
          </div>

          <form onSubmit={handleIngestUrl} className="mt-4">
            <label className="block text-xs font-medium text-gray-700">Ingest a web page</label>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                value={urlToIngest}
                onChange={(e) => setUrlToIngest(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
                disabled={isIngestingUrl}
              />
              <button
                type="submit"
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
                  isIngestingUrl
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "bg-gray-900 text-white hover:bg-black"
                }`}
                disabled={isIngestingUrl}
              >
                {isIngestingUrl ? "…" : "Add"}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">Only HTTP/HTTPS URLs are supported.</p>
          </form>

          <div className="mt-3">
            {filesLoading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : fileError ? (
              <div className="text-sm text-red-600">{fileError}</div>
            ) : uploadedFiles.length === 0 ? (
              <p className="text-sm text-gray-500">No files uploaded yet.</p>
            ) : (
              <ul className="space-y-2 list-none p-0 m-0">
                {uploadedFiles.map((file) => (
                  <li
                    key={file.filename}
                    className="flex items-start justify-between gap-3 rounded-md border bg-white p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{file.filename}</div>
                      {file.uploadedAt ? (
                        <div className="mt-0.5 text-xs text-gray-500">
                          Uploaded {formatDate(file.uploadedAt)}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(file.filename)}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notice ? (
            <div
              className={`mt-4 rounded-md border p-3 text-sm ${
                notice.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
              role="status"
            >
              {notice.text}
            </div>
          ) : null}
        </aside>

        <section className="flex min-h-[70vh] flex-col rounded-lg border bg-white">
          <div className="flex-1 overflow-y-auto p-4">
            {noMessages ? (
              <div className="text-sm text-gray-600">
                No messages yet. Try asking:{" "}
                <span className="font-medium">“How do I add a chatbot to my website?”</span>
              </div>
            ) : (
              <ul className="space-y-2 list-none p-0 m-0">
                {messages.map((message) => (
                  <Bubble key={message.id} message={message} />
                ))}
                {status === "streaming" && <LoadingBubble />}
              </ul>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
            <input
              type="text"
              onChange={handleInputChange}
              value={input}
              placeholder="Ask something…"
              disabled={status !== "ready"}
              className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                status === "ready"
                  ? "bg-gray-900 text-white hover:bg-black"
                  : "cursor-not-allowed bg-gray-200 text-gray-500"
              }`}
              disabled={status !== "ready"}
            >
              {status === "ready" ? "Send" : "Working…"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
