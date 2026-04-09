import type { Message } from "ai";

type BubbleProps = {
  message: Pick<Message, "role" | "content">;
};

export default function Bubble({ message }: BubbleProps) {
  return (
    <li className={`${message.role} bubble whitespace-pre-wrap break-words`}>
      {message.content}
    </li>
  );
}
