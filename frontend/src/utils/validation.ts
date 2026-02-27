import { z } from 'zod'
import { CreateIssueDataSchema } from '../schemas/issues'

/**
 * Validate issue creation data
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateIssueData(data: unknown): 
  | { success: true; data: z.infer<typeof CreateIssueDataSchema> }
  | { success: false; errors: z.ZodError } {
  try {
    const validated = CreateIssueDataSchema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * Format Zod errors into user-friendly messages
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}
  
  error.errors.forEach((err: z.ZodIssue) => {
    const path = err.path.join('.')
    formatted[path] = err.message
  })
  
  return formatted
}

/**
 * Get first error message from Zod error
 */
export function getFirstErrorMessage(error: z.ZodError): string {
  return error.errors[0]?.message || 'Validation error'
}

