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
  nodes: MindMapNodeResponse[]
  createdAt: string
  updatedAt: string
}

export interface MindMapNodeResponse {
  id: string
  text: string
  position: { x: number; y: number }
  connections: string[]
}
