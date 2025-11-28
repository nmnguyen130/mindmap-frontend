export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    name?: string
  }
  token: string
}

export interface MindMapResponse {
  id: string
  title: string
  central_topic: string
  summary?: string
  nodes: MindMapNodeResponse[]
  edges: {
    from: string
    to: string
    relationship?: string
  }[]
  createdAt: string
  updatedAt: string
}

export interface MindMapNodeResponse {
  id: string
  label: string
  keywords: string[]
  level: number
  parent_id: string | null
  position?: { x: number; y: number }
  notes?: string | null
}
