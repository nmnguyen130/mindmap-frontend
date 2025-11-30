import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, TOKEN_KEYS } from '@/constants/config';

// ============================================================================
// Types
// ============================================================================

export interface ChatRequest {
    question: string;
    document_id: string;
    match_threshold?: number;
    match_count?: number;
}

export interface ChatChunk {
    content: string;
}

// ============================================================================
// RAG API Service
// ============================================================================

/**
 * Send chat message and stream response using SSE
 * @param request Chat request parameters
 * @param onChunk Callback for each streamed chunk
 * @param onComplete Callback when streaming completes
 * @param onError Callback for errors
 * @returns XMLHttpRequest instance for abort capability
 */
export function streamChat(
    request: ChatRequest,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
): XMLHttpRequest {
    const xhr = new XMLHttpRequest();

    // Get token and setup request asynchronously
    SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN).then((token) => {
        xhr.open('POST', `${API_BASE_URL}/api/rag/chat`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

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
                            onChunk(parsed.content);
                        }
                    } catch (e) {
                        // Ignore JSON parse errors for incomplete chunks
                    }
                }
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onComplete();
            } else {
                onError(new Error(`HTTP error! status: ${xhr.status}`));
            }
        };

        xhr.onerror = () => {
            onError(new Error('Network request failed'));
        };

        xhr.send(JSON.stringify({
            question: request.question,
            document_id: request.document_id,
            match_threshold: request.match_threshold ?? 0.0,
            match_count: request.match_count ?? 5,
        }));
    }).catch((error) => {
        onError(error instanceof Error ? error : new Error('Failed to get auth token'));
    });

    return xhr;
}
