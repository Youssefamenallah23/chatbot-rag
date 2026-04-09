## Chatbot RAG (Next.js + Astra DB + Gemini)

This project is a **RAG chatbot**:

- Upload documents (`.pdf`, `.txt`, `.docx`, `.md`)
- Ingest web pages by URL (scrapes page text, chunks + embeds, stores in Astra)
- Chat queries retrieve the most relevant chunks and use them as **context** for the Gemini chat model

## Setup

Copy `.env.example` to `.env` and fill in the required values:

Required:

- `GEMINI_API_KEY` (Google AI Studio key)
- `ASTRA_DB_NAMESPACE`
- `ASTRA_DB_COLLECTION`
- `ASTRA_DB_ENDPOINT`
- `ASTRA_DB_APPLICATION_TOKEN`

Optional (defaults are shown in `.env.example`):

- `GEMINI_CHAT_MODEL` (default: `gemini-3.0-flash`)
- `GEMINI_EMBEDDING_MODEL` (default: `text-embedding-004`)
- `GEMINI_DOCUMENT_MODEL` (default: `gemini-3.0-pro-exp`)
- `RAG_TOP_K` (default: `8`)
- `RAG_MAX_CHUNK_CHARS` (default: `900`)
- `RAG_MAX_CONTEXT_CHARS` (default: `4500`)
- `MAX_UPLOAD_MB` (default: `10`)
- `SCRAPE_MAX_CHARS` (default: `200000`)
- `SCRAPE_TIMEOUT_MS` (default: `15000`)

Security note: never commit real secrets. If a key/token has been exposed, rotate it.

## Dev

```bash
npm run dev
```

Open `http://localhost:3000`.

## Add knowledge

**Option A: Upload a document**

- Use the “Upload file” button in the UI.

**Option B: Ingest a web page URL**

- Paste a URL in the UI (HTTP/HTTPS only).
- The app fetches the HTML, extracts visible text, then chunks + embeds it into Astra DB.

Note: Be respectful of websites’ terms of service and robots policies. Only ingest content you have the right to process.

## Seed sample data

This scrapes a couple of pages and loads them into Astra DB:

```bash
npm run seed
```

You can also provide your own URLs:

```bash
npm run seed -- https://example.com/page1 https://example.com/page2
```

Or via env:

```bash
SEED_URLS="https://example.com/page1,https://example.com/page2" npm run seed
```

## Quality checks

```bash
npm run lint
npm run typecheck
```

## Reuse / attribution

This code is free to use.

If you ship something based on it, please:

- ⭐ Star the repo
- Add a short reference/link back to this project in your README or credits
