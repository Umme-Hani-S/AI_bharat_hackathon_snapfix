import api from './client'

export interface Client {
  _id: string
  name: string
  email: string
  phone?: string
  companyName: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  status: 'active' | 'inactive' | 'pending'
  subscriptionTier: 'free' | 'basic' | 'professional' | 'enterprise'
  sites?: Array<{ _id: string; name: string; code: string }>
  users?: Array<{ _id: string; name: string; email: string; role: string }>
  createdBy?: { _id: string; name: string; email: string }
  createdAt: string
  updatedAt: string
}

export interface CreateClientData {
  name: string
  email: string
  phone?: string
  companyName: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  status?: 'active' | 'inactive' | 'pending'
  subscriptionTier?: 'free' | 'basic' | 'professional' | 'enterprise'
  password?: string
}

export interface ClientStats {
  totalSites: number
  totalUsers: number
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  subscriptionTier: string
  status: string
}

export const clientsApi = {
  getAll: async (params?: { status?: string; search?: string }): Promise<Client[]> => {
    const { data } = await api.get<Client[]>('/clients', { params })
    return data
  },
  getById: async (id: string): Promise<Client> => {
    const { data } = await api.get<Client>(`/clients/${id}`)
    return data
  },
  create: async (clientData: CreateClientData): Promise<Client> => {
    const { data } = await api.post<Client>('/clients', clientData)
    return data
  },
  update: async (id: string, clientData: Partial<CreateClientData>): Promise<Client> => {
    const { data } = await api.put<Client>(`/clients/${id}`, clientData)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`)
  },
  getStats: async (id: string): Promise<ClientStats> => {
    const { data } = await api.get<ClientStats>(`/clients/${id}/stats`)
    return data
  },
}

