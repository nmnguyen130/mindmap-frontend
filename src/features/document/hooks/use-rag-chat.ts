import { useState, useCallback } from "react";
import * as ragApi from "../services/rag-api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseRagChatOptions {
  documentId?: string;
  onError?: (error: Error) => void;
}

/**
 * Hook for streaming RAG chat with document context.
 */
export const useRagChat = ({ documentId, onError }: UseRagChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!documentId || !question.trim() || isStreaming) return;

      // Add user message
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question, timestamp: new Date() },
      ]);
      setIsStreaming(true);

      // Add empty assistant message to update
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", timestamp: new Date() },
      ]);

      let content = "";

      try {
        ragApi.streamChat(
          {
            question,
            document_id: documentId,
            match_threshold: 0.0,
            match_count: 5,
          },
          (chunk) => {
            content += chunk;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content,
              };
              return updated;
            });
          },
          () => setIsStreaming(false),
          (error) => {
            console.error("Chat error:", error);
            onError?.(error);
            setIsStreaming(false);
          }
        );
      } catch (error) {
        if (error instanceof Error) {
          console.error("Chat error:", error);
          onError?.(error);
        }
        setIsStreaming(false);
      }
    },
    [documentId, isStreaming, onError]
  );

  const generateSummary = useCallback(
    async (label: string) => {
      await sendMessage(`Provide a brief summary of: ${label}`);
    },
    [sendMessage]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sendMessage, generateSummary, clear };
};
