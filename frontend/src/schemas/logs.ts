import { z } from 'zod'

// Log Type enum
const LogTypeSchema = z.enum(['issue-creation-organization', 'issue-creation-public', 'issue-creation-mobile', 'error', 'warning', 'info'])

// Log Level enum
const LogLevelSchema = z.enum(['error', 'warning', 'info', 'debug'])

// Issue reference schema (can be string ID or populated object)
const IssueReferenceSchema = z.union([
  z.string(),
  z.object({
    _id: z.string(),
    title: z.string(),
    status: z.string(),
    priority: z.string(),
  }),
])

// User reference schema
const UserReferenceSchema = z.union([
  z.string(),
  z.object({
    _id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
])

// Client reference schema
const ClientReferenceSchema = z.union([
  z.string(),
  z.object({
    _id: z.string(),
    name: z.string(),
  }),
])

// Log Schema
export const LogSchema = z.object({
  _id: z.string(),
  action: z.string(),
  type: LogTypeSchema,
  level: LogLevelSchema.optional().default('info'), // Backend defaults to 'info'
  fileName: z.string(),
  lineNumber: z.number(),
  functionName: z.string().optional().nullable(), // Backend: required: false
  message: z.string(),
  errorStack: z.string().optional().nullable(),
  errorName: z.string().optional().nullable(),
  issueId: IssueReferenceSchema.optional().nullable(),
  userId: UserReferenceSchema.optional().nullable(),
  clientId: ClientReferenceSchema.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.union([z.string(), z.date()]).transform((val: string | Date) => 
    val instanceof Date ? val.toISOString() : val
  ),
  updatedAt: z.union([z.string(), z.date()]).transform((val: string | Date) => 
    val instanceof Date ? val.toISOString() : val
  ),
})

// Get Logs Params Schema
export const GetLogsParamsSchema = z.object({
  type: LogTypeSchema.optional(),
  level: LogLevelSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// Export types
export type Log = z.infer<typeof LogSchema>
export type GetLogsParams = z.infer<typeof GetLogsParamsSchema>

