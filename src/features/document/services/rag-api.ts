import { useAuthStore } from "@/features/auth";
import { API_BASE_URL } from "@/constants/config";
import { refreshTokensWithMutex } from "@/features/auth/utils/token-refresh";

export interface ChatRequest {
  question: string;
  document_id: string;
  match_threshold?: number;
  match_count?: number;
}

export interface ChatChunk {
  content: string;
}

/**
 * Send chat message and stream response using SSE.
 * Includes automatic token refresh on 401.
 *
 * @param request - Chat request parameters
 * @param onChunk - Callback for each streamed chunk
 * @param onComplete - Callback when streaming completes
 * @param onError - Callback for errors
 * @returns XMLHttpRequest instance for abort capability
 */
export function streamChat(
  request: ChatRequest,
  onChunk: (content: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): XMLHttpRequest {
  const xhr = new XMLHttpRequest();
  const { accessToken } = useAuthStore.getState();

  if (!accessToken) {
    setTimeout(() => onError(new Error("Not authenticated")), 0);
    return xhr;
  }

  const doRequest = (token: string, isRetry = false) => {
    const req = isRetry ? new XMLHttpRequest() : xhr;

    req.open("POST", `${API_BASE_URL}/api/rag/chat`, true);
    req.setRequestHeader("Content-Type", "application/json");
    req.setRequestHeader("Authorization", `Bearer ${token}`);

    let lastIndex = 0;

    req.onprogress = () => {
      const newText = req.responseText.substring(lastIndex);
      lastIndex = req.responseText.length;

      for (const line of newText.split("\n")) {
        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const { content } = JSON.parse(data);
          if (content) onChunk(content);
        } catch {
          // Ignore incomplete chunks
        }
      }
    };

    req.onload = () => {
      if (req.status >= 200 && req.status < 300) {
        onComplete();
        return;
      }

      // Token expired - try refresh once
      if (req.status === 401 && !isRetry) {
        refreshTokensWithMutex()
          .then(() => {
            const newToken = useAuthStore.getState().accessToken;
            if (newToken) doRequest(newToken, true);
            else onError(new Error("Not authenticated"));
          })
          .catch(() => {
            useAuthStore.getState().clearTokens();
            onError(new Error("Session expired. Please login again."));
          });
        return;
      }

      onError(new Error(`HTTP error! status: ${req.status}`));
    };

    req.onerror = () => onError(new Error("Network request failed"));

    req.send(
      JSON.stringify({
        question: request.question,
        document_id: request.document_id,
        match_threshold: request.match_threshold ?? 0.0,
        match_count: request.match_count ?? 5,
      })
    );

    return req;
  };

  doRequest(accessToken);
  return xhr;
}
