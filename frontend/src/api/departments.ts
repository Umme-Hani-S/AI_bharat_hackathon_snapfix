import api from './client'

export interface DepartmentSummary {
  _id: string
  name: string
  enabled: boolean
  isCompliance: boolean
  memberCount: number
  activeTickets: number
  totalTickets: number
}

export interface CreateDepartmentPayload {
  name: string
  isCompliance?: boolean
}

export interface UpdateDepartmentPayload {
  name?: string
  isCompliance?: boolean
}

export const departmentsApi = {
  getAll: async (): Promise<DepartmentSummary[]> => {
    const { data } = await api.get<DepartmentSummary[]>('/departments')
    return data
  },
  create: async (payload: CreateDepartmentPayload): Promise<void> => {
    await api.post('/departments', payload)
  },
  update: async (id: string, payload: UpdateDepartmentPayload): Promise<void> => {
    await api.put(`/departments/${id}`, payload)
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}`)
  },
}


