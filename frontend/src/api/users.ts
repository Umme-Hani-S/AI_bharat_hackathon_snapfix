import api from './client'

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  isSuperAdmin?: boolean
  roles: string[]
  siteIds: string[]
  departmentIds: string[]
}

export interface CreatedUserResponse {
  _id: string
  name: string
  email: string
  isSuperAdmin: boolean
  isClientAdmin?: boolean
  activeTickets?: number
  roles?: string[]
  siteIds?: string[]
  departmentIds?: string[]
}

export const usersApi = {
  create: async (payload: CreateUserPayload): Promise<CreatedUserResponse> => {
    const { data } = await api.post<CreatedUserResponse>('/users', payload)
    return data
  },
  getAll: async (): Promise<CreatedUserResponse[]> => {
    const { data } = await api.get<CreatedUserResponse[]>('/users')
    return data
  },
  update: async (
    id: string,
    payload: Partial<CreateUserPayload>
  ): Promise<CreatedUserResponse> => {
    const { data } = await api.put<CreatedUserResponse>(`/users/${id}`, payload)
    return data
  },
}


