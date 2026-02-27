import { z } from 'zod'

// User schema (can be string ID, populated object, or null)
const UserSchema = z.union([
  z.string(),
  z.object({
    _id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  z.null(),
])

// Site schema (can be string ID, populated object, or null)
const SiteSchema = z.union([
  z.string(),
  z.object({
    _id: z.string(),
    name: z.string(),
    code: z.string().optional(),
  }),
  z.null(),
])

// Category schema (can be string ID, populated object, or null)
const CategorySchema = z.union([
  z.string(),
  z.object({
    _id: z.string(),
    name: z.string(),
    description: z.string().optional(),
  }),
  z.null(),
])

// Department schema (can be string ID, populated object, or null)
const DepartmentSchema = z.union([
  z.string(),
  z.object({
    _id: z.string(),
    name: z.string(),
  }),
  z.null(),
])

// Issue Status enum
const IssueStatusSchema = z.enum(['open', 'in-progress', 'resolved', 'closed'])

// Priority enum
const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

// Issue Schema
export const IssueSchema = z.object({
  _id: z.string(),
  title: z.string().optional().nullable(),
  description: z.string(),
  status: IssueStatusSchema,
  priority: PrioritySchema,
  images: z.array(z.string()),
  resolutionImages: z.array(z.string()).optional(),
  resolutionDescription: z.string().optional().nullable(),
  aiSuggestions: z.array(z.string()).optional(),
  aiReportAnalysis: z.object({
    suggestedPersonal: z.array(z.unknown()).optional(),
    potentialRisks: z.array(z.unknown()).optional(),
    aiIssueTitle: z.string().optional(),
  }).optional().nullable(),
  aiResolutionAnalysis: z.unknown().optional().nullable(),
  createdAt: z.union([z.string(), z.date()]).transform((val: string | Date) => 
    val instanceof Date ? val.toISOString() : val
  ),
  updatedAt: z.union([z.string(), z.date()]).transform((val: string | Date) => 
    val instanceof Date ? val.toISOString() : val
  ),
  userId: UserSchema.optional().nullable(),
  site: SiteSchema.optional().nullable(),
  category: CategorySchema.optional().nullable(),
  department: DepartmentSchema.optional().nullable(),
  assignedTo: UserSchema.optional().nullable(),
  locationId: z.union([z.string(), z.object({
    _id: z.string(),
    name: z.string(),
  }), z.null()]).optional().nullable(),
  createdGps: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional().nullable(),
  resolvedGps: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional().nullable(),
  platform: z.enum(['web', 'mobile-ios', 'mobile-android', 'mobile-web', 'public', 'api']).optional().nullable(),
  dueDate: z.union([z.string(), z.date(), z.null()]).optional().nullable().transform((val: string | Date | null | undefined) => {
    if (val === undefined || val === null) return null
    if (val instanceof Date) return val.toISOString()
    return val
  }),
  resolutionTime: z.union([z.string(), z.date(), z.null()]).optional().nullable().transform((val: string | Date | null | undefined) => {
    if (val === undefined || val === null) return null
    if (val instanceof Date) return val.toISOString()
    return val
  }),
  clientId: z.string().optional().nullable(),
  comments: z.array(z.object({
    type: z.enum(['created', 'status', 'resolved', 'edit', 'assigned']),
    message: z.string(),
    userId: UserSchema.optional().nullable(),
    createdAt: z.union([z.string(), z.date()]).transform((val: string | Date) =>
      typeof val === 'string' ? val : val.toISOString()
    ),
    payload: z.object({
      oldStatus: z.string().optional(),
      newStatus: z.string().optional(),
      changedFields: z.array(z.string()).optional(),
      assignedTo: z.string().optional(),
      fieldChanges: z.record(z.unknown()).optional(),
    }).optional().nullable(),
  })).optional().default([]),
})

// Create Issue Data Schema
export const CreateIssueDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional().default(''),
  priority: PrioritySchema,
  siteId: z.string().optional(),
  site: z.string().optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  image: z.instanceof(File).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})
  .refine(
    (data: { siteId?: string; site?: string }) => data.siteId || data.site,
    {
      message: 'Either siteId or site is required',
      path: ['siteId'],
    }
  )
  .refine(
    (data: { description?: string; image?: File }) => {
      const hasDescription = data.description && data.description.trim().length > 0
      const hasImage = !!data.image
      return hasDescription || hasImage
    },
    {
      message: 'Either a description or an image is required to create an issue',
      path: ['description'],
    }
  )

// AI Response Schema
export const AIResponseSchema = z.object({
  suggestions: z.array(z.string()),
  analysis: z.string(),
})

// Classification Payload Schema
export const ClassificationPayloadSchema = z.object({
  title: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  siteName: z.string().optional(),
  currentCategory: z.string().optional(),
  currentPriority: PrioritySchema.optional(),
  attachments: z.array(z.string()).optional(),
})

// Classification Result Schema
export const ClassificationResultSchema = z.object({
  department: z.object({
    name: z.string(),
    reason: z.string(),
  }).optional().nullable(),
  category: z.object({
    name: z.string(),
    reason: z.string(),
  }).optional().nullable(),
  priority: z.object({
    level: PrioritySchema,
    reason: z.string(),
  }).optional().nullable(),
  confidence: z.number().nullable().optional(),
  recommendedTeams: z.array(z.string()).optional(),
  raw: z.string().optional(),
  success: z.boolean().optional(),
})

// Resolution Validation Result Schema
export const ResolutionValidationResultSchema = z.object({
  resolved: z.boolean().optional(),
  aiConfidence: z.number().optional(),
  reasoning: z.string().optional(),
  imageComparison: z.string().optional(),
  gpsMatch: z.boolean().nullable().optional(),
  gpsDistance: z.number().optional(),
  gpsWarning: z.boolean().optional(),
  gpsWarningMessage: z.string().optional(),
  missingDetails: z.array(z.string()).optional(),
})

// Export types inferred from schemas
export type Issue = z.infer<typeof IssueSchema>
export type CreateIssueData = z.infer<typeof CreateIssueDataSchema>
export type AIResponse = z.infer<typeof AIResponseSchema>
export type ClassificationPayload = z.infer<typeof ClassificationPayloadSchema>
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>
export type ResolutionValidationResult = z.infer<typeof ResolutionValidationResultSchema>

