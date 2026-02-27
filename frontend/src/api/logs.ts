import api from './client'
import { z } from 'zod'
import { LogSchema, GetLogsParamsSchema, type Log, type GetLogsParams } from '../schemas/logs'

// Re-export types for backward compatibility
export type { Log, GetLogsParams }

export const logsApi = {
  getAll: async (params?: GetLogsParams): Promise<Log[]> => {
    // Validate params if provided
    const validatedParams = params ? GetLogsParamsSchema.safeParse(params) : { success: true as const, data: undefined }
    if (!validatedParams.success && 'error' in validatedParams) {
      console.warn('Invalid logs params:', validatedParams.error)
      // Use original params if validation fails
    }
    
    const queryParams = new URLSearchParams()
    const paramsToUse = validatedParams.success ? validatedParams.data : params
    if (paramsToUse?.type) {
      queryParams.append('type', paramsToUse.type)
    }
    if (paramsToUse?.level) {
      queryParams.append('level', paramsToUse.level)
    }
    if (paramsToUse?.startDate) {
      queryParams.append('startDate', paramsToUse.startDate)
    }
    if (paramsToUse?.endDate) {
      queryParams.append('endDate', paramsToUse.endDate)
    }
    const queryString = queryParams.toString()
    const url = queryString ? `/logs?${queryString}` : '/logs'
    const { data } = await api.get<Log[]>(url)
    
    // Handle undefined or null data
    if (!data) {
      console.warn('No data received from logs API')
      return []
    }
    
    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.error('Logs API returned non-array data:', data)
      return []
    }
    
    // Validate response with Zod (non-blocking)
    if (!LogSchema) {
      console.error('LogSchema is not defined')
      return data as Log[]
    }
    
    try {
      const validation = z.array(LogSchema).safeParse(data)
      if (!validation.success) {
        console.error('Logs validation error:', validation.error)
        console.error('Raw data:', data)
        // Return data anyway to prevent blocking UI
        return data as Log[]
      }
      return validation.data
    } catch (error) {
      console.error('Error during Zod validation:', error)
      // Return data anyway to prevent blocking UI
      return data as Log[]
    }
  },
  getById: async (id: string): Promise<Log> => {
    const { data } = await api.get<Log>(`/logs/${id}`)
    
    // Handle undefined or null data
    if (!data) {
      throw new Error('No data received from logs API')
    }
    
    // Validate response with Zod (non-blocking)
    if (!LogSchema) {
      console.error('LogSchema is not defined')
      return data as Log
    }
    
    try {
      const validation = LogSchema.safeParse(data)
      if (!validation.success) {
        console.error('Log validation error:', validation.error)
        console.error('Raw data:', data)
        // Return data anyway to prevent blocking UI
        return data as Log
      }
      return validation.data
    } catch (error) {
      console.error('Error during Zod validation:', error)
      // Return data anyway to prevent blocking UI
      return data as Log
    }
  },
}

