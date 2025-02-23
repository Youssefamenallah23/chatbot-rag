"use client";

import { useChat } from "@ai-sdk/react";
import Image from "next/image";
import Bubble from "./_components/Bubble";
import LoadingBubble from "./_components/LoadingBubble";
import { useRef, useState } from "react";

function Home() {
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
  });
  const noMessages = !messages || messages.length == 0;
  /* const handleprompt = (promptText: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      content: promptText,
      role: "user",
    };
    append(msg);
  };*/
  return (
    <main className="h-screen">
      <header className="p-6 mb-4">
        <Image src="./next.svg" alt="Conv-ai Logo" height={100} width={140} />
      </header>
      <section className="flex flex-col items-start justify-end h-[80%] gap-6 p-4">
        {noMessages ? (
          <>
            <p>No messages yet</p>
          </>
        ) : (
          <ul className="ml-8">
            {messages.map((m, i) => (
              <div key={`message-${i}`}>
                <Bubble message={m} />
                <div>
                  {m?.experimental_attachments
                    ?.filter((attachment) =>
                      attachment?.contentType?.startsWith("image/")
                    )
                    .map((attachment, index) => (
                      <Image
                        key={`${m.id}-${index}`}
                        src={attachment.url}
                        width={500}
                        height={500}
                        alt={`attachment.name ?? attachment-${index}`}
                      />
                    ))}
                </div>
              </div>
            ))}

            {status === "streaming" ? <LoadingBubble /> : <></>}
          </ul>
        )}

        <form
          onSubmit={(event) => {
            handleSubmit(event, {
              experimental_attachments: files,
            });

            setFiles(undefined);

            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }}
          className="w-full flex justify-center"
        >
          <input
            type="file"
            className=""
            onChange={(event) => {
              if (event.target.files) {
                setFiles(event.target.files);
              }
            }}
            multiple
            ref={fileInputRef}
          />
          <input
            type="text"
            onChange={handleInputChange}
            value={input}
            placeholder="Ask Me something..."
          />
          <input
            type="submit"
            className={`cursor-pointer p-2 rounded-md bg-black text-white ${
              status !== "ready" ? "disabled" : ""
            }`}
          />
        </form>
      </section>
    </main>
  );
}

export default Home;
