import api from './client'

export interface SiteSummary {
  _id: string
  name: string
  code?: string
  location?: string
  description?: string
  timeZone?: string
  latitude?: number
  longitude?: number
  openTickets: number
  atRiskTickets: number
  resolvedTickets: number
  avgResolutionTime: string
}

export interface CreateSitePayload {
  name: string
  code?: string
  timeZone?: string
  latitude?: number
  longitude?: number
  enabled?: boolean
  enableSms?: boolean
  enableGps?: boolean
}

export interface UpdateSitePayload extends Partial<CreateSitePayload> {}

export const sitesApi = {
  getAll: async (): Promise<SiteSummary[]> => {
    const { data } = await api.get<SiteSummary[]>('/sites')
    return data
  },
  getById: async (id: string): Promise<SiteSummary> => {
    const { data } = await api.get<SiteSummary>(`/sites/${id}`)
    return data
  },
  create: async (payload: CreateSitePayload): Promise<{ _id: string; name: string }> => {
    const { data } = await api.post('/sites', payload)
    return data
  },
  update: async (id: string, payload: UpdateSitePayload): Promise<SiteSummary> => {
    const { data } = await api.put<SiteSummary>(`/sites/${id}`, payload)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/sites/${id}`)
  },
}


