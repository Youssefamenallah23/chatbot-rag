import { GoogleGenerativeAI } from "@google/generative-ai";
// import { OpenAIStream, StreamingTextResponse } from "@ai-sdk/react";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GEMINI_API_KEY,
} = process.env;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!, // Pass your API key in the config
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
// const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const model = google("gemini-2.0-flash");
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages?.length - 1]?.content;

    let docContext = "";

    const embeddingResponse = await embeddingModel.embedContent(latestMessage);
    const vectorEmbedding = embeddingResponse.embedding.values;

    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION!);
      const cursor = await collection.find(
        {
          $vector: {
            $exists: true, // Ensure vectors are present
          },
        },
        {
          sort: { $vector: vectorEmbedding },
          limit: 10,
        }
      );

      const documents = await cursor.toArray();

      const docsMap = documents?.map((doc) => doc.pageContent);

      docContext = JSON.stringify(docsMap);
    } catch (error) {
      console.error("Error querying Astra DB: " + error);
      docContext = "";
    }

    const template = {
      role: "assistant",
      content: `
            You are an AI assitant who knows everything about chatbot integration in websites. Use the below context to augment what you know about chatbots integration. The context will provide you with the best methods to integrate chatbots in websites. 
            If the context doesn't include the information you need, answer based on your existing knowledge and don't mention the source of information or what the context does or doesn't include.
            Format responses using markdown where applicable and don't return images.
            ----------------
            START CONTEXT
            ${docContext}
            END CONTEXT
            ----------------
            QUESTION: ${latestMessage}
            ----------------
        `,
    };

    const geminiMessages = [template, ...messages].map((msg, i) => {
      return {
        id: String(i),
        role: msg.role === "user" ? "user" : msg.role,
        content: msg.content,
        parts: [
          {
            type: "text",
            text: msg.content,
          },
        ],
      };
    });

    const aiStream = streamText({
      model: model,
      messages: geminiMessages,
    });

    /* return new Response(aiStream.textStream, {
      headers: { "Content-Type": "text/event-stream" },
    }); */
    return aiStream.toDataStreamResponse();
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
    });
  }
}
