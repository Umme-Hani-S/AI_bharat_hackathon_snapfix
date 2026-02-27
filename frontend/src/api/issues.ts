import api from './client'
import { z } from 'zod'
import { 
  IssueSchema, 
  CreateIssueDataSchema,
  AIResponseSchema,
  ClassificationResultSchema,
  ResolutionValidationResultSchema,
  type Issue,
  type CreateIssueData,
  type AIResponse,
  type ClassificationResult,
  type ResolutionValidationResult,
} from '../schemas/issues'

// Re-export types from schemas
export type { Issue, CreateIssueData, AIResponse, ClassificationResult, ResolutionValidationResult }

// Helper function to detect platform
const detectPlatform = (): 'web' | 'mobile-ios' | 'mobile-android' | 'mobile-web' | 'public' | 'api' => {
  if (typeof window === 'undefined') return 'api'
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  
  // Check for mobile devices
  if (/android/i.test(userAgent)) {
    // Check if it's a mobile web browser or native app
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return 'mobile-android'
    }
    return 'mobile-web'
  }
  
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    // Check if it's a mobile web browser or native app
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return 'mobile-ios'
    }
    return 'mobile-web'
  }
  
  return 'web'
}

// Additional interfaces that are not in schemas
export interface ClassificationPayload {
  title?: string
  description: string
  siteName?: string
  currentCategory?: string
  currentPriority?: Issue['priority']
  attachments?: string[]
}

export const issuesApi = {
  getAll: async (params?: { startDate?: string; endDate?: string }): Promise<Issue[]> => {
    const queryParams = new URLSearchParams()
    if (params?.startDate) {
      queryParams.append('startDate', params.startDate)
    }
    if (params?.endDate) {
      queryParams.append('endDate', params.endDate)
    }
    const queryString = queryParams.toString()
    const url = queryString ? `/issues?${queryString}` : '/issues'
    const { data } = await api.get<Issue[]>(url)
    
    // Validate response with Zod (non-blocking)
    const validation = z.array(IssueSchema).safeParse(data)
    if (!validation.success) {
      console.error('Issues validation error:', validation.error)
      console.error('Raw data:', data)
      // Return data anyway to prevent blocking UI
      return data as Issue[]
    }
    return validation.data
  },
  getById: async (id: string): Promise<Issue> => {
    const { data } = await api.get<Issue>(`/issues/${id}`)
    
    // Validate response with Zod (non-blocking)
    const validation = IssueSchema.safeParse(data)
    if (!validation.success) {
      console.error('Issue validation error:', validation.error)
      console.error('Raw data:', data)
      // Return data anyway to prevent blocking UI
      return data as Issue
    }
    return validation.data
  },
  create: async (issueData: CreateIssueData): Promise<Issue> => {
    // Validate input data before sending
    const validationResult = CreateIssueDataSchema.safeParse(issueData)
    if (!validationResult.success) {
      // Extract user-friendly error message from Zod errors
      const errorMessages = validationResult.error.errors.map(err => err.message)
      const firstError = errorMessages[0] || 'Invalid input data'
      throw new Error(firstError)
    }
    
    const validatedData = validationResult.data
    const formData = new FormData()
    if (validatedData.title) {
      formData.append('title', validatedData.title)
    }
    // Always append description (backend validates that either description or image is provided)
    formData.append('description', validatedData.description || '')
    formData.append('priority', validatedData.priority)
    
    if (validatedData.siteId) {
      formData.append('siteId', validatedData.siteId)
    } else if (validatedData.site) {
      formData.append('site', validatedData.site)
    }
    if (validatedData.category) {
      formData.append('category', validatedData.category)
    }
    if (validatedData.department) {
      formData.append('department', validatedData.department)
    }
    if (validatedData.assignedTo) {
      formData.append('assignedTo', validatedData.assignedTo)
    }
    if (validatedData.dueDate) {
      formData.append('dueDate', validatedData.dueDate)
    }
    
    if (validatedData.image) {
      formData.append('image', validatedData.image)
    }
    
    // Append GPS coordinates (required)
    formData.append('latitude', validatedData.latitude.toString())
    formData.append('longitude', validatedData.longitude.toString())
    
    // Append platform (detect from user agent or default to 'web')
    const platform = detectPlatform()
    formData.append('platform', platform)
    
    const { data } = await api.post<Issue>('/issues', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    // Validate response with Zod (non-blocking)
    const validation = IssueSchema.safeParse(data)
    if (!validation.success) {
      console.error('Issue creation validation error:', validation.error)
      console.error('Raw data:', data)
      return data as Issue
    }
    return validation.data
  },
  update: async (id: string, payload: { title?: string; description?: string; priority?: Issue['priority']; dueDate?: string | null; category?: string | null }): Promise<Issue> => {
    const { data } = await api.patch<Issue>(`/issues/${id}`, payload)
    const validation = IssueSchema.safeParse(data)
    if (!validation.success) {
      console.error('Issue update validation error:', validation.error)
      return data as Issue
    }
    return validation.data
  },
  updateDueDate: async (id: string, dueDate: string | null): Promise<Issue> => {
    const { data } = await api.patch<Issue>(`/issues/${id}/due-date`, { dueDate: dueDate ?? null })
    const validation = IssueSchema.safeParse(data)
    if (!validation.success) {
      console.error('Issue updateDueDate validation error:', validation.error)
      return data as Issue
    }
    return validation.data
  },
  assign: async (id: string, userId: string | null): Promise<Issue> => {
    const { data } = await api.patch<Issue>(`/issues/${id}/assign`, { userId: userId ?? null })
    const validation = IssueSchema.safeParse(data)
    if (!validation.success) {
      console.error('Issue assign validation error:', validation.error)
      return data as Issue
    }
    return validation.data
  },
  updateStatus: async (id: string, status: Issue['status']): Promise<Issue> => {
    const { data } = await api.patch<Issue>(`/issues/${id}/status`, { status })
    // Validate response with Zod (non-blocking)
    const validation = IssueSchema.safeParse(data)
    if (!validation.success) {
      console.error('Issue update validation error:', validation.error)
      console.error('Raw data:', data)
      return data as Issue
    }
    return validation.data
  },
  resolve: async (
    id: string,
    payload: { resolutionDescription?: string; resolutionImage?: File; latitude: number; longitude: number }
  ): Promise<{ issue: Issue; validation?: ResolutionValidationResult }> => {
    const formData = new FormData()
    if (payload.resolutionDescription) {
      formData.append('resolutionDescription', payload.resolutionDescription)
    }
    if (payload.resolutionImage) {
      formData.append('resolutionImage', payload.resolutionImage)
    }
    // Append GPS coordinates (required)
    formData.append('latitude', payload.latitude.toString())
    formData.append('longitude', payload.longitude.toString())
    const { data } = await api.patch<{ issue: Issue; validation?: ResolutionValidationResult }>(
      `/issues/${id}/resolve`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    // Validate response with Zod (non-blocking)
    const issueValidation = IssueSchema.safeParse(data.issue)
    const validationResult = data.validation 
      ? ResolutionValidationResultSchema.safeParse(data.validation)
      : { success: true, data: undefined }
    
    if (!issueValidation.success) {
      console.error('Issue resolve validation error:', issueValidation.error)
      console.error('Raw issue data:', data.issue)
    }
    if (data.validation && !validationResult.success && 'error' in validationResult) {
      console.error('Resolution validation error:', validationResult.error)
      console.error('Raw validation data:', data.validation)
    }
    
    return {
      issue: issueValidation.success ? issueValidation.data : (data.issue as Issue),
      validation: validationResult.success ? validationResult.data : undefined,
    }
  },
  getAISuggestions: async (id: string): Promise<AIResponse> => {
    const { data } = await api.post<AIResponse>(`/issues/${id}/ai-suggestions`)
    // Validate response with Zod (non-blocking)
    const validation = AIResponseSchema.safeParse(data)
    if (!validation.success) {
      console.error('AI suggestions validation error:', validation.error)
      console.error('Raw data:', data)
      return data as AIResponse
    }
    return validation.data
  },
  classify: async (payload: ClassificationPayload): Promise<ClassificationResult> => {
    const { data } = await api.post<ClassificationResult>('/issues/classify', payload)
    // Validate response with Zod (non-blocking)
    const validation = ClassificationResultSchema.safeParse(data)
    if (!validation.success) {
      console.error('Classification validation error:', validation.error)
      console.error('Raw data:', data)
      return data as ClassificationResult
    }
    return validation.data
  },
  downloadReport: async (startDate: string, endDate: string): Promise<void> => {
    try {
      const response = await api.get('/issues/report/download', {
        params: { startDate, endDate },
        responseType: 'blob',
      })
      
      // Check if response is actually a blob (Excel file) or an error JSON
      const contentType = response.headers['content-type'] || ''
      
      if (contentType.includes('application/json')) {
        // Error response - parse the JSON
        const text = await (response.data as Blob).text()
        const errorData = JSON.parse(text)
        throw new Error(errorData.message || 'Failed to generate report')
      }
      
      // Verify it's an Excel file
      if (!contentType.includes('spreadsheet') && !contentType.includes('excel')) {
        // Might be an error, try to parse
        try {
          const text = await (response.data as Blob).text()
          const errorData = JSON.parse(text)
          throw new Error(errorData.message || 'Failed to generate report')
        } catch {
          throw new Error('Invalid file format received')
        }
      }
      
      // Create a blob from the response data
      const blob = response.data instanceof Blob 
        ? response.data 
        : new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
      
      // Create a link and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `issues-report-${startDate}-to-${endDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
        window.URL.revokeObjectURL(url)
      }, 100)
    } catch (error: any) {
      // Handle axios errors
      if (error.response) {
        // If response is a blob, try to parse it as JSON error
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text()
            const errorData = JSON.parse(text)
            throw new Error(errorData.message || 'Failed to generate report')
          } catch {
            throw new Error('Failed to generate report')
          }
        }
        throw new Error(error.response.data?.message || 'Failed to generate report')
      }
      throw error
    }
  },
}

