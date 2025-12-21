import { useState, useCallback } from "react";
import * as ragApi from "../services/rag-api";

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseRagChatOptions {
  documentId?: string;
  onError?: (error: Error) => void;
}

// ============================================================================
// React Hook for RAG Chat
// ============================================================================

/**
 * Hook for streaming RAG chat with document context
 */
export const useRagChat = ({ documentId, onError }: UseRagChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (question: string) => {
      // Early return if no documentId or invalid input
      if (!documentId || !question.trim() || isStreaming) return;

      // Add user message
      const userMessage: ChatMessage = {
        role: "user",
        content: question,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      // Add empty assistant message that we'll update
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      let assistantContent = "";

      try {
        ragApi.streamChat(
          {
            question,
            document_id: documentId,
            match_threshold: 0.0,
            match_count: 5,
          },
          // onChunk
          (content) => {
            assistantContent += content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: assistantContent,
              };
              return updated;
            });
          },
          // onComplete
          () => {
            setIsStreaming(false);
          },
          // onError
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
    async (label: string, keywords: string[]) => {
      const summaryQuestion = `Provide a brief summary of: ${label}`;
      await sendMessage(summaryQuestion);
    },
    [sendMessage]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    generateSummary,
    clear,
  };
};
