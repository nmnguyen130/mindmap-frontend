import { API_BASE_URL } from "@/constants/config";
import { useAuthStore } from "@/features/auth";

export interface MindmapNode {
  id: string;
  label: string;
  keywords: string[];
  level: number;
  parent_id: string | null;
}

export interface MindmapEdge {
  id: string;
  from: string;
  to: string;
  relationship?: string;
}

export interface CreateFromPdfResponse {
  document: {
    id: string;
    name: string;
    storage_object_id: string;
    created_by: string;
    created_at: number;
  };
  sections_count: number;
  mindmap?: {
    id: string;
    title: string;
    mindmap_data: {
      central_topic: string;
      summary?: string;
      nodes: MindmapNode[];
      edges: MindmapEdge[];
    };
  };
}

export interface CreateFromPdfRequest {
  file: {
    uri: string;
    name: string;
    type: string;
  };
  title?: string;
  generateMindmap?: boolean;
}

/**
 * Upload PDF and optionally generate mindmap.
 * Uses auth store for token access.
 */
export async function createFromPdf(
  data: CreateFromPdfRequest
): Promise<CreateFromPdfResponse> {
  const { accessToken } = useAuthStore.getState();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();

  formData.append("file", {
    uri: data.file.uri,
    name: data.file.name,
    type: data.file.type,
  } as any);

  if (data.title) {
    formData.append("title", data.title);
  }

  if (data.generateMindmap !== undefined) {
    formData.append("generateMindmap", data.generateMindmap.toString());
  }

  const response = await fetch(`${API_BASE_URL}/api/rag/create-from-pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || "Failed to upload PDF");
  }

  const result = await response.json();
  return result.data;
}
