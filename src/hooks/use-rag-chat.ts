import { useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, TOKEN_KEYS } from '@/constants/config';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface UseRagChatOptions {
    documentId: string;
    onError?: (error: Error) => void;
}

export const useRagChat = ({ documentId, onError }: UseRagChatOptions) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    documentId = 'ebd75e05-7f31-4439-b64d-8d7b4564efb7';

    const sendMessage = useCallback(
        async (question: string) => {
            if (!question.trim() || isStreaming) return;

            // Add user message
            const userMessage: ChatMessage = {
                role: 'user',
                content: question,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage]);
            setIsStreaming(true);

            try {
                const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);

                // Use XMLHttpRequest for SSE streaming (React Native compatible)
                const xhr = new XMLHttpRequest();

                xhr.open('POST', `${API_BASE_URL}/api/rag/chat`, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }

                let assistantContent = '';
                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                };

                // Add empty assistant message that we'll update
                setMessages((prev) => [...prev, assistantMessage]);

                let lastProcessedIndex = 0;

                xhr.onprogress = () => {
                    const responseText = xhr.responseText;
                    const newText = responseText.substring(lastProcessedIndex);
                    lastProcessedIndex = responseText.length;

                    const lines = newText.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);

                            if (data === '[DONE]') {
                                continue;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.content) {
                                    assistantContent += parsed.content;

                                    // Update assistant message content
                                    setMessages((prev) => {
                                        const updated = [...prev];
                                        updated[updated.length - 1] = {
                                            ...updated[updated.length - 1],
                                            content: assistantContent,
                                        };
                                        return updated;
                                    });
                                }
                            } catch (e) {
                                // Ignore JSON parse errors for incomplete chunks
                            }
                        }
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        setIsStreaming(false);
                    } else {
                        throw new Error(`HTTP error! status: ${xhr.status}`);
                    }
                };

                xhr.onerror = () => {
                    const error = new Error('Network request failed');
                    console.error('Chat error:', error);
                    onError?.(error);
                    setIsStreaming(false);
                };

                xhr.send(JSON.stringify({
                    question,
                    document_id: documentId,
                    match_threshold: 0.0,
                    match_count: 5,
                }));
            } catch (error) {
                if (error instanceof Error) {
                    console.error('Chat error:', error);
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
