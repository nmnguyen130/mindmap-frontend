import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL, TOKEN_KEYS } from '@/constants/config';

// Types
interface CreateFromPdfResponse {
    id: string;
    name: string;
    storage_object_id: string;
    sections_created: number;
    created_at: string;
    mindmap?: {
        id: string;
        title: string;
        mindmap_data: {
            title: string;
            central_topic: string;
            summary?: string;
            nodes: MindmapNode[];
            edges: MindmapEdge[];
        };
        nodes_count: number;
    };
}

interface MindmapNode {
    id: string;
    label: string;
    keywords: string[];
    level: number;
    parent_id: string | null;
}

interface MindmapEdge {
    from: string;
    to: string;
    relationship?: string;
}

interface CreateFromPdfRequest {
    file: {
        uri: string;
        name: string;
        type: string;
    };
    title?: string;
    generateMindmap?: boolean;
}

// API calls
const pdfApi = {
    createFromPdf: async (data: CreateFromPdfRequest): Promise<CreateFromPdfResponse> => {
        // Get access token from secure storage
        const accessToken = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);

        if (!accessToken) {
            throw new Error('Not authenticated');
        }

        // Create FormData
        const formData = new FormData();

        // Add file
        formData.append('file', {
            uri: data.file.uri,
            name: data.file.name,
            type: data.file.type,
        } as any);

        // Add optional parameters
        if (data.title) {
            formData.append('title', data.title);
        }

        if (data.generateMindmap !== undefined) {
            formData.append('generateMindmap', data.generateMindmap.toString());
        }

        const response = await fetch(`${API_BASE_URL}/api/rag/create-from-pdf`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || 'Failed to upload PDF');
        }

        const result = await response.json();
        return result.data;
    },
};

// Hooks
export const useCreateFromPdf = () => {
    return useMutation({
        mutationFn: pdfApi.createFromPdf,
    });
};
