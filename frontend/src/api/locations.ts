import api from './client'

export interface Location {
  _id: string
  clientId: string
  siteId?: string
  name: string
  locationCode?: string
  shortCode?: string
  area?: string
  city?: string
  address?: string
  timeZone?: string
  loc?: {
    type: 'Point' | 'LineString' | 'Polygon'
    coordinates: number[] // [longitude, latitude] for Point
  }
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateLocationPayload {
  name: string
  siteId?: string
  locationCode?: string
  shortCode?: string
  area?: string
  city?: string
  address?: string
  timeZone?: string
  latitude?: number
  longitude?: number
  locType?: 'Point' | 'LineString' | 'Polygon'
  enabled?: boolean
}

export interface UpdateLocationPayload extends Partial<CreateLocationPayload> {}

export const locationsApi = {
  getAll: async (siteId?: string): Promise<Location[]> => {
    const params = siteId ? { siteId } : {}
    const { data } = await api.get<Location[]>('/locations', { params })
    return data
  },
  getById: async (id: string): Promise<Location> => {
    const { data } = await api.get<Location>(`/locations/${id}`)
    return data
  },
  create: async (payload: CreateLocationPayload): Promise<Location> => {
    const { data } = await api.post<Location>('/locations', payload)
    return data
  },
  update: async (id: string, payload: UpdateLocationPayload): Promise<Location> => {
    const { data } = await api.put<Location>(`/locations/${id}`, payload)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/locations/${id}`)
  },
}

