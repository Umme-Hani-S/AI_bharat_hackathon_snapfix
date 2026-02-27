import api from './client'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  clientId: string
}

export type AccountType = 'client' | 'user'

export interface AuthResponse {
  user: {
    id: string
    name: string
    email: string
    role: string
    clientId: string
    accountType?: AccountType
  }
  token: string
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials)
    return data
  },
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', userData)
    return data
  },
}

