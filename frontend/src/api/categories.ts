import api from './client'

export interface CategorySummary {
  _id: string
  name: string
  description?: string
  ticketCount: number
  color: string
}

export interface CreateCategoryPayload {
  name: string
  description?: string
}

export const categoriesApi = {
  getAll: async (): Promise<CategorySummary[]> => {
    const { data } = await api.get<CategorySummary[]>('/categories')
    return data
  },
  create: async (payload: CreateCategoryPayload): Promise<void> => {
    await api.post('/categories', payload)
  },
}


