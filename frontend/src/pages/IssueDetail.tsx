import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { issuesApi, Issue } from '../api/issues'
import { categoriesApi, type CategorySummary } from '../api/categories'
import { usersApi, type CreatedUserResponse } from '../api/users'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Sparkles,
  Image as ImageIcon,
  User,
  MapPin,
  Building2,
  Tag,
  AlertTriangle,
  Users,
  MessageSquare,
  Edit3,
  UserPlus,
} from 'lucide-react'
import { format } from 'date-fns'

const statusConfig = {
  open: { icon: AlertCircle, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', label: 'Open' },
  'in-progress': { icon: Clock, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', label: 'In Progress' },
  resolved: { icon: CheckCircle, color: 'text-green-500 bg-green-500/10 border-green-500/20', label: 'Resolved' },
  closed: { icon: XCircle, color: 'text-gray-500 bg-gray-500/10 border-gray-500/20', label: 'Closed' },
}

const priorityConfig = {
  low: { color: 'bg-gray-500/10 text-gray-400', label: 'Low' },
  medium: { color: 'bg-blue-500/10 text-blue-400', label: 'Medium' },
  high: { color: 'bg-orange-500/10 text-orange-400', label: 'High' },
  critical: { color: 'bg-red-500/10 text-red-400', label: 'Critical' },
}

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)
  const [resolutionDescription, setResolutionDescription] = useState('')
  const [resolutionImage, setResolutionImage] = useState<File | null>(null)
  const [resolutionImagePreview, setResolutionImagePreview] = useState<string | null>(null)
  const [resolveSubmitting, setResolveSubmitting] = useState(false)
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [capturingGps, setCapturingGps] = useState(false)
  const [gpsMismatchError, setGpsMismatchError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<{ issue: Issue; validation?: any } | null>(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [isEditingDueDate, setIsEditingDueDate] = useState(false)
  const [dueDateEditValue, setDueDateEditValue] = useState('')
  const [dueDateSubmitting, setDueDateSubmitting] = useState(false)
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [categoryEditValue, setCategoryEditValue] = useState('')
  const [categorySubmitting, setCategorySubmitting] = useState(false)
  const [users, setUsers] = useState<CreatedUserResponse[]>([])
  const [isEditingAssignedTo, setIsEditingAssignedTo] = useState(false)
  const [assignedToEditValue, setAssignedToEditValue] = useState('')
  const [assignedToSubmitting, setAssignedToSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      loadIssue()
    }
  }, [id])

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => {})
  }, [])
  useEffect(() => {
    usersApi.getAll().then(setUsers).catch(() => {})
  }, [])

  // Capture GPS when resolve modal opens
  useEffect(() => {
    if (isResolveModalOpen) {
      captureGpsLocation()
    } else {
      // Reset GPS state when modal closes
      setGpsLocation(null)
      setGpsError(null)
      setGpsMismatchError(null)
    }
  }, [isResolveModalOpen])

  const captureGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please enable location services.')
      return
    }

    setCapturingGps(true)
    setGpsError(null)
    setGpsMismatchError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setCapturingGps(false)
        setGpsError(null)
      },
      (error) => {
        setCapturingGps(false)
        let errorMessage = 'Failed to capture GPS location. '
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access and try again.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.'
            break
          default:
            errorMessage += 'An unknown error occurred.'
            break
        }
        setGpsError(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const loadIssue = async () => {
    try {
      const data = await issuesApi.getById(id!)
      setIssue(data)
    } catch (error: any) {
      toast.error('Failed to load issue')
      navigate('/tickets')
    } finally {
      setLoading(false)
    }
  }

  const getSiteName = (site: Issue['site']) => {
    if (!site) return 'Unknown'
    return typeof site === 'string' ? site : site.name
  }

  const getDepartmentName = (department: Issue['department']) => {
    if (!department) return 'Not assigned'
    return typeof department === 'string' ? department : department.name
  }

  const getCategoryName = (category: Issue['category']) => {
    if (!category) return 'Not assigned'
    return typeof category === 'string' ? category : category.name
  }

  const getUserName = (userId: Issue['userId']) => {
    if (!userId) return 'Unknown'
    return typeof userId === 'string' ? userId : userId.name
  }

  const getAssignedToName = (assignedTo: Issue['assignedTo']) => {
    if (!assignedTo) return 'Not assigned'
    return typeof assignedTo === 'string' ? assignedTo : assignedTo.name
  }

  // Comment author: show "Public" for public-created issues or when userId is null
  const getCommentAuthor = (comment: { userId?: { _id?: string; name?: string } | string | null; message?: string }) => {
    if (comment.message?.toLowerCase().includes('public')) return 'Public'
    if (!comment.userId) return 'Public'
    return typeof comment.userId === 'object' && comment.userId?.name ? comment.userId.name : 'User'
  }

  const comments = issue?.comments ?? []
  const createdComments = comments.filter((c) => c.type === 'created')
  const resolvedComments = comments.filter((c) => c.type === 'resolved')
  const statusComments = comments.filter((c) => c.type === 'status')
  const editComments = comments.filter((c) => c.type === 'edit')
  const assignedComments = comments.filter((c) => c.type === 'assigned')
  const hasAnyComments = createdComments.length > 0 || resolvedComments.length > 0 || statusComments.length > 0 || editComments.length > 0 || assignedComments.length > 0


  const handleStatusChange = async (newStatus: Issue['status']) => {
    if (!id) return
    try {
      const updated = await issuesApi.updateStatus(id, newStatus)
      setIssue(updated)
      toast.success('Status updated')
    } catch (error: any) {
      toast.error('Failed to update status')
    }
  }

  const canEditDueDate = issue?.status === 'open' || issue?.status === 'in-progress'

  const startEditingDueDate = () => {
    if (!issue) return
    const current = issue.dueDate
    setDueDateEditValue(
      current
        ? format(new Date(current), 'yyyy-MM-dd')
        : ''
    )
    setIsEditingDueDate(true)
  }

  const cancelEditingDueDate = () => {
    setIsEditingDueDate(false)
    setDueDateEditValue('')
  }

  const handleDueDateSave = async () => {
    if (!id) return
    setDueDateSubmitting(true)
    try {
      const value = dueDateEditValue.trim() ? dueDateEditValue : null
      const updated = await issuesApi.updateDueDate(id, value)
      setIssue(updated)
      setIsEditingDueDate(false)
      setDueDateEditValue('')
      toast.success(value ? 'Due date updated' : 'Due date cleared')
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to update due date'
      toast.error(msg)
    } finally {
      setDueDateSubmitting(false)
    }
  }

  const startEditingCategory = () => {
    if (!issue) return
    const currentId = typeof issue.category === 'object' && issue.category && issue.category._id
      ? issue.category._id
      : typeof issue.category === 'string'
        ? issue.category
        : ''
    setCategoryEditValue(currentId)
    setIsEditingCategory(true)
  }

  const cancelEditingCategory = () => {
    setIsEditingCategory(false)
    setCategoryEditValue('')
  }

  const handleCategorySave = async () => {
    if (!id) return
    setCategorySubmitting(true)
    try {
      const value = categoryEditValue.trim() || null
      const updated = await issuesApi.update(id, { category: value })
      setIssue(updated)
      setIsEditingCategory(false)
      setCategoryEditValue('')
      toast.success('Category updated')
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to update category'
      toast.error(msg)
    } finally {
      setCategorySubmitting(false)
    }
  }

  const startEditingAssignedTo = () => {
    if (!issue) return
    const currentId = typeof issue.assignedTo === 'object' && issue.assignedTo && issue.assignedTo._id
      ? issue.assignedTo._id
      : typeof issue.assignedTo === 'string'
        ? issue.assignedTo
        : ''
    setAssignedToEditValue(currentId)
    setIsEditingAssignedTo(true)
  }

  const cancelEditingAssignedTo = () => {
    setIsEditingAssignedTo(false)
    setAssignedToEditValue('')
  }

  const handleAssignedToSave = async () => {
    if (!id) return
    setAssignedToSubmitting(true)
    try {
      const value = assignedToEditValue.trim() || null
      const updated = await issuesApi.assign(id, value)
      setIssue(updated)
      setIsEditingAssignedTo(false)
      setAssignedToEditValue('')
      toast.success(value ? 'Issue reassigned' : 'Assignment cleared')
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to reassign'
      toast.error(msg)
    } finally {
      setAssignedToSubmitting(false)
    }
  }

  const resetResolveForm = () => {
    setResolutionDescription('')
    if (resolutionImagePreview) {
      URL.revokeObjectURL(resolutionImagePreview)
    }
    setResolutionImage(null)
    setResolutionImagePreview(null)
  }

  const handleImageChange = (file: File | null) => {
    if (resolutionImagePreview) {
      URL.revokeObjectURL(resolutionImagePreview)
    }
    setResolutionImage(file)
    setResolutionImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    // Validate GPS location is captured
    if (!gpsLocation) {
      toast.error('GPS location is required for resolution. Please allow location access and try again.')
      captureGpsLocation()
      return
    }

    setResolveSubmitting(true)
    setGpsMismatchError(null)
    try {
      const response = await issuesApi.resolve(id, {
        resolutionDescription: resolutionDescription.trim() || undefined,
        resolutionImage: resolutionImage || undefined,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
      })
      setIssue(response.issue)
      
      // Show validation result modal if validation data exists
      if (response.validation) {
        setValidationResult(response)
        setShowValidationModal(true)
      } else {
        toast.success('Ticket marked as resolved')
      }
      
      setIsResolveModalOpen(false)
      resetResolveForm()
    } catch (error: any) {
      const errorCode = error.response?.data?.code
      const errorMessage = error.response?.data?.message || 'Failed to mark as resolved'
      
      // Handle GPS mismatch error
      if (errorCode === 'GPS_MISMATCH') {
        setGpsMismatchError(errorMessage)
        const distance = error.response?.data?.distance
        const tolerance = error.response?.data?.tolerance
        toast.error(`GPS location mismatch: You are ${distance}m away from the issue location (${tolerance}m tolerance).`, { duration: 8000 })
      } else if (errorCode === 'GPS_REQUIRED' || errorCode === 'INVALID_GPS') {
        setGpsError(errorMessage)
        toast.error(errorMessage)
        captureGpsLocation()
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setResolveSubmitting(false)
    }
  }

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (resolutionImagePreview) {
        URL.revokeObjectURL(resolutionImagePreview)
      }
    }
  }, [resolutionImagePreview])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!issue) {
    return null
  }


  const StatusIcon = statusConfig[issue.status].icon

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/tickets')}
        className="flex items-center space-x-2 text-dark-text-muted hover:text-dark-text transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Tickets</span>
      </button>

      {/* Main Issue Card */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-dark-text mb-2">{issue.title}</h1>
            {issue.aiReportAnalysis?.aiIssueTitle && issue.aiReportAnalysis.aiIssueTitle !== issue.title && (
              <p className="text-sm text-dark-text-muted mb-3">
                AI Suggested Title: <span className="italic">{issue.aiReportAnalysis.aiIssueTitle}</span>
              </p>
            )}
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${statusConfig[issue.status].color}`}>
                <StatusIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{statusConfig[issue.status].label}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig[issue.priority].color}`}>
                {priorityConfig[issue.priority].label} Priority
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {issue.status !== 'resolved' && issue.status !== 'closed' && (
              <button
                onClick={() => setIsResolveModalOpen(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <CheckCircle className="h-5 w-5" />
                <span>Mark as Resolved</span>
              </button>
            )}
            <select
              value={issue.status}
              onChange={(e) => handleStatusChange(e.target.value as Issue['status'])}
              className="px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600 cursor-pointer"
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Issue Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-dark-text-muted" />
            <div>
              <p className="text-xs text-dark-text-muted uppercase">Site</p>
              <p className="text-dark-text font-medium">{getSiteName(issue.site)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-dark-text-muted" />
            <div>
              <p className="text-xs text-dark-text-muted uppercase">Department</p>
              <p className="text-dark-text font-medium">{getDepartmentName(issue.department)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Tag className="h-5 w-5 text-dark-text-muted" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dark-text-muted uppercase">Category</p>
              {isEditingCategory ? (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <select
                    value={categoryEditValue}
                    onChange={(e) => setCategoryEditValue(e.target.value)}
                    disabled={categorySubmitting}
                    className="px-3 py-1.5 bg-dark-surface border border-dark-border rounded-lg text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 min-w-[160px]"
                  >
                    <option value="">Not assigned</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCategorySave}
                    disabled={categorySubmitting}
                    className="px-2.5 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {categorySubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingCategory}
                    disabled={categorySubmitting}
                    className="px-2.5 py-1.5 border border-dark-border text-dark-text-muted text-sm rounded-lg hover:bg-dark-surface disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-dark-text font-medium">{getCategoryName(issue.category)}</p>
                  {canEditDueDate && (
                    <button
                      type="button"
                      onClick={startEditingCategory}
                      className="text-sm text-primary-500 hover:text-primary-400 flex items-center gap-1"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Change
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-dark-text-muted" />
            <div>
              <p className="text-xs text-dark-text-muted uppercase">Reported By</p>
              <p className="text-dark-text font-medium">{getUserName(issue.userId)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <UserPlus className="h-5 w-5 text-dark-text-muted" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dark-text-muted uppercase">Assigned To</p>
              {isEditingAssignedTo ? (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <select
                    value={assignedToEditValue}
                    onChange={(e) => setAssignedToEditValue(e.target.value)}
                    disabled={assignedToSubmitting}
                    className="px-3 py-1.5 bg-dark-surface border border-dark-border rounded-lg text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 min-w-[160px]"
                  >
                    <option value="">Not assigned</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.email ? `(${u.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignedToSave}
                    disabled={assignedToSubmitting}
                    className="px-2.5 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {assignedToSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingAssignedTo}
                    disabled={assignedToSubmitting}
                    className="px-2.5 py-1.5 border border-dark-border text-dark-text-muted text-sm rounded-lg hover:bg-dark-surface disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-dark-text font-medium">{getAssignedToName(issue.assignedTo)}</p>
                  {canEditDueDate && (
                    <button
                      type="button"
                      onClick={startEditingAssignedTo}
                      className="text-sm text-primary-500 hover:text-primary-400 flex items-center gap-1"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Reassign
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-dark-text-muted" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dark-text-muted uppercase">Due Date</p>
              {isEditingDueDate ? (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <input
                    type="date"
                    value={dueDateEditValue}
                    onChange={(e) => setDueDateEditValue(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    disabled={dueDateSubmitting}
                    className="px-3 py-1.5 bg-dark-surface border border-dark-border rounded-lg text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 min-w-[140px]"
                  />
                  <button
                    type="button"
                    onClick={handleDueDateSave}
                    disabled={dueDateSubmitting}
                    className="px-2.5 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {dueDateSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingDueDate}
                    disabled={dueDateSubmitting}
                    className="px-2.5 py-1.5 border border-dark-border text-dark-text-muted text-sm rounded-lg hover:bg-dark-surface disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-dark-text font-medium">
                    {issue.dueDate
                      ? format(new Date(issue.dueDate), 'MMM d, yyyy')
                      : 'Not set'}
                  </p>
                  {canEditDueDate && (
                    <button
                      type="button"
                      onClick={startEditingDueDate}
                      className="text-sm text-primary-500 hover:text-primary-400 flex items-center gap-1"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Change
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-dark-text mb-2">Description</h2>
          <p className="text-dark-text-muted whitespace-pre-wrap">{issue.description}</p>
        </div>

        {issue.images.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Issue Images</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {issue.images.map((imageUrl, index) => (
                <a
                  key={index}
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group"
                >
                  <img
                    src={imageUrl}
                    alt={`Issue image ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border border-dark-border hover:border-primary-600 transition-colors"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {issue.resolutionImages && issue.resolutionImages.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Resolution Images</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {issue.resolutionImages.map((imageUrl, index) => (
                <a
                  key={index}
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group"
                >
                  <img
                    src={imageUrl}
                    alt={`Resolution image ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border border-dark-border hover:border-primary-600 transition-colors"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {(() => {
          const desc: unknown = issue.resolutionDescription
          if (desc && typeof desc === 'string') {
            const resolutionDesc: string = desc
            return (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-dark-text mb-2">Resolution Notes</h2>
                <p className="text-dark-text-muted whitespace-pre-wrap">{resolutionDesc}</p>
              </div>
            )
          }
          return null
        })() as any}

        {issue.aiResolutionAnalysis && typeof issue.aiResolutionAnalysis === 'object' && issue.aiResolutionAnalysis !== null && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-dark-text mb-2">AI Validation & Analysis</h2>
            <div className="bg-dark-surface border border-dark-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-dark-text">
                  Status:{' '}
                  <span className={`font-semibold ${
                    'resolved' in issue.aiResolutionAnalysis && issue.aiResolutionAnalysis.resolved 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {'resolved' in issue.aiResolutionAnalysis && issue.aiResolutionAnalysis.resolved ? 'Resolved' : 'Not Resolved'}
                  </span>
                </p>
                {'aiConfidence' in issue.aiResolutionAnalysis && typeof issue.aiResolutionAnalysis.aiConfidence === 'number' && (
                  <p className="text-dark-text-muted">
                    Confidence: {(issue.aiResolutionAnalysis.aiConfidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              
              {'reasoning' in issue.aiResolutionAnalysis && typeof issue.aiResolutionAnalysis.reasoning === 'string' && (
                <div>
                  <p className="text-sm font-medium text-dark-text mb-1">Analysis:</p>
                  <p className="text-dark-text-muted whitespace-pre-wrap">{issue.aiResolutionAnalysis.reasoning}</p>
                </div>
              )}
              
              {'imageComparison' in issue.aiResolutionAnalysis && typeof issue.aiResolutionAnalysis.imageComparison === 'string' && (
                <div>
                  <p className="text-sm font-medium text-dark-text mb-1">Image Comparison:</p>
                  <p className="text-dark-text-muted whitespace-pre-wrap">{issue.aiResolutionAnalysis.imageComparison}</p>
                </div>
              )}
              
              {'gpsMatch' in issue.aiResolutionAnalysis && issue.aiResolutionAnalysis.gpsMatch !== null && (
                <div className="flex items-center space-x-2">
                  <MapPin className={`h-4 w-4 ${
                    issue.aiResolutionAnalysis.gpsMatch ? 'text-green-400' : 'text-red-400'
                  }`} />
                  <p className="text-dark-text">
                    GPS Location:{' '}
                    <span className={issue.aiResolutionAnalysis.gpsMatch ? 'text-green-400' : 'text-red-400'}>
                      {issue.aiResolutionAnalysis.gpsMatch ? 'Matched' : 'Mismatch'}
                    </span>
                    {'gpsDistance' in issue.aiResolutionAnalysis && typeof issue.aiResolutionAnalysis.gpsDistance === 'number' && (
                      <span className="text-dark-text-muted ml-2">
                        ({issue.aiResolutionAnalysis.gpsDistance}m distance)
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              {'gpsWarning' in issue.aiResolutionAnalysis && 
               typeof issue.aiResolutionAnalysis.gpsWarning === 'boolean' && 
               issue.aiResolutionAnalysis.gpsWarning && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ {'gpsWarningMessage' in issue.aiResolutionAnalysis && typeof issue.aiResolutionAnalysis.gpsWarningMessage === 'string'
                      ? issue.aiResolutionAnalysis.gpsWarningMessage
                      : 'GPS location mismatch detected, but resolution was accepted based on image analysis.'}
                  </p>
                </div>
              )}
              
              {'missingDetails' in issue.aiResolutionAnalysis && 
               Array.isArray(issue.aiResolutionAnalysis.missingDetails) && 
               issue.aiResolutionAnalysis.missingDetails.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-dark-text mb-1">Missing Details:</p>
                  <ul className="list-disc list-inside text-dark-text-muted space-y-1">
                    {issue.aiResolutionAnalysis.missingDetails.map((detail: string, index: number) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-dark-border">
          <div className="text-sm text-dark-text-muted">
            Created {format(new Date(issue.createdAt), 'MMM d, yyyy h:mm a')}
            {issue.updatedAt !== issue.createdAt && (
              <span className="ml-4">Updated {format(new Date(issue.updatedAt), 'MMM d, yyyy h:mm a')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Activity & Comments */}
      {hasAnyComments && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary-600/10 p-2 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-dark-text">Activity & comments</h2>
              <p className="text-sm text-dark-text-muted">Creation, status changes, resolution, and edits</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Created */}
            {createdComments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-dark-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Created
                </h3>
                <ul className="space-y-2">
                  {createdComments.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-dark-text">{c.message}</span>
                      <span className="text-dark-text-muted">by {getCommentAuthor(c)}</span>
                      <span className="text-dark-text-muted shrink-0">
                        {format(new Date(c.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resolved */}
            {resolvedComments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-dark-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Resolved
                </h3>
                <ul className="space-y-2">
                  {resolvedComments.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-dark-text">{c.message}</span>
                      <span className="text-dark-text-muted">by {getCommentAuthor(c)}</span>
                      <span className="text-dark-text-muted shrink-0">
                        {format(new Date(c.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Status changes */}
            {statusComments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-dark-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status changes
                </h3>
                <ul className="space-y-2">
                  {statusComments.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-dark-text">{c.message}</span>
                      <span className="text-dark-text-muted">by {getCommentAuthor(c)}</span>
                      <span className="text-dark-text-muted shrink-0">
                        {format(new Date(c.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Edits */}
            {editComments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-dark-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edits
                </h3>
                <ul className="space-y-2">
                  {editComments.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-dark-text">{c.message}</span>
                      <span className="text-dark-text-muted">by {getCommentAuthor(c)}</span>
                      <span className="text-dark-text-muted shrink-0">
                        {format(new Date(c.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Assignment */}
            {assignedComments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-dark-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Assignment
                </h3>
                <ul className="space-y-2">
                  {assignedComments.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-dark-text">{c.message}</span>
                      <span className="text-dark-text-muted">by {getCommentAuthor(c)}</span>
                      <span className="text-dark-text-muted shrink-0">
                        {format(new Date(c.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Report Analysis */}
      {issue.aiReportAnalysis && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary-600/10 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-dark-text">AI Report Analysis</h2>
              <p className="text-sm text-dark-text-muted">AI-generated insights and recommendations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {issue.aiReportAnalysis.suggestedPersonal && issue.aiReportAnalysis.suggestedPersonal.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="h-5 w-5 text-primary-400" />
                  <h3 className="text-lg font-semibold text-dark-text">Suggested Personnel</h3>
                </div>
                <div className="space-y-2">
                  {issue.aiReportAnalysis.suggestedPersonal.map((person, index) => (
                    <div
                      key={index}
                      className="bg-dark-surface border border-dark-border rounded-lg p-3"
                    >
                      <p className="text-dark-text">{typeof person === 'string' ? person : String(person)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {issue.aiReportAnalysis.potentialRisks && issue.aiReportAnalysis.potentialRisks.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-dark-text">Potential Risks</h3>
                </div>
                <div className="space-y-2">
                  {issue.aiReportAnalysis.potentialRisks.map((risk, index) => (
                    <div
                      key={index}
                      className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3"
                    >
                      <p className="text-orange-400">{typeof risk === 'string' ? risk : String(risk)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!resolveSubmitting) {
                setIsResolveModalOpen(false)
                resetResolveForm()
              }
            }}
          ></div>
          <div className="relative bg-white border border-gray-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600/20 to-green-500/10 border-b border-green-500/20 px-6 py-5">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Mark as Resolved</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Document the resolution with an image and description
                  </p>
                </div>
              </div>
            </div>

            {/* Issue Context */}
            {issue && (
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-gray-500 text-xs">DEPARTMENT</span>
                      <p className="text-gray-900 font-medium">{getDepartmentName(issue.department)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-gray-500 text-xs">REPORTED BY</span>
                      <p className="text-gray-900 font-medium">{getUserName(issue.userId)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Content */}
            <form className="p-6 space-y-6" onSubmit={handleResolveSubmit}>
              {/* GPS Location Status */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MapPin className={`h-5 w-5 ${gpsLocation ? 'text-green-500' : gpsError || gpsMismatchError ? 'text-red-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        GPS Location {gpsLocation ? '(Captured)' : '(Required)'}
                      </p>
                      {gpsLocation ? (
                        <p className="text-xs text-green-600 mt-1">
                          Lat: {gpsLocation.latitude.toFixed(6)}, Lng: {gpsLocation.longitude.toFixed(6)}
                        </p>
                      ) : gpsError ? (
                        <p className="text-xs text-red-600 mt-1">{gpsError}</p>
                      ) : gpsMismatchError ? (
                        <p className="text-xs text-red-600 mt-1 font-semibold">{gpsMismatchError}</p>
                      ) : capturingGps ? (
                        <p className="text-xs text-gray-500 mt-1">Capturing location...</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Click to capture location</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={captureGpsLocation}
                    disabled={capturingGps}
                    className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {capturingGps ? 'Capturing...' : gpsLocation ? 'Retry' : 'Capture'}
                  </button>
                </div>
              </div>

              {/* Resolution Image */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4 text-gray-700" />
                    <span>Resolution Image</span>
                    <span className="text-xs text-gray-500 font-normal">(optional)</span>
                  </div>
                </label>
                
                {resolutionImage && resolutionImagePreview ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      <img
                        src={resolutionImagePreview}
                        alt="Resolution preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-green-500/30"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageChange(null)}
                        disabled={resolveSubmitting}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 rounded-full text-white transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 flex items-center space-x-1">
                      <ImageIcon className="h-3 w-3" />
                      <span>{resolutionImage.name}</span>
                    </p>
                  </div>
                ) : (
                  <label className="block">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                        disabled={resolveSubmitting}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500/50 hover:bg-green-50 transition-all cursor-pointer group">
                        <div className="flex flex-col items-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                            <ImageIcon className="h-6 w-6 text-gray-500 group-hover:text-green-600 transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG, GIF up to 10MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {/* Resolution Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-gray-700" />
                    <span>Resolution Description</span>
                    <span className="text-xs text-gray-500 font-normal">(optional)</span>
                  </div>
                </label>
                <textarea
                  rows={5}
                  value={resolutionDescription}
                  onChange={(e) => setResolutionDescription(e.target.value)}
                  disabled={resolveSubmitting}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all resize-none"
                  placeholder="Describe how this issue was resolved. Include details about the work performed, materials used, or any other relevant information..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  At least one field (image or description) is required for AI validation
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  onClick={() => {
                    if (!resolveSubmitting) {
                      setIsResolveModalOpen(false)
                      resetResolveForm()
                    }
                  }}
                  disabled={resolveSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveSubmitting || (!resolutionDescription.trim() && !resolutionImage)}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium shadow-lg shadow-green-500/20"
                >
                  {resolveSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Confirm Resolve</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Validation Result Modal */}
      {showValidationModal && validationResult && validationResult.validation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setShowValidationModal(false)}
          ></div>
          <div className="relative bg-white border border-gray-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`bg-gradient-to-r ${
              validationResult.validation.resolved 
                ? 'from-green-600/20 to-green-500/10 border-green-500/20' 
                : 'from-red-600/20 to-red-500/10 border-red-500/20'
            } border-b px-6 py-5`}>
              <div className="flex items-center space-x-3">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full ${
                  validationResult.validation.resolved 
                    ? 'bg-green-500/20' 
                    : 'bg-red-500/20'
                } flex items-center justify-center`}>
                  {validationResult.validation.resolved ? (
                    <CheckCircle className="h-7 w-7 text-green-600" />
                  ) : (
                    <XCircle className="h-7 w-7 text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {validationResult.validation.resolved 
                      ? 'Issue Resolved & Validated' 
                      : 'Resolution Validation Failed'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    AI analysis and GPS verification results
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div className={`px-4 py-2 rounded-lg ${
                  validationResult.validation.resolved 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <span className="font-semibold">
                    {validationResult.validation.resolved ? '✅ Resolved' : '❌ Not Resolved'}
                  </span>
                </div>
                {validationResult.validation.aiConfidence && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Confidence: </span>
                    <span className="font-bold text-primary-600">
                      {(validationResult.validation.aiConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Reasoning */}
              {validationResult.validation.reasoning && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <Sparkles className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">AI Analysis</h4>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                        {validationResult.validation.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Comparison */}
              {validationResult.validation.imageComparison && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Image Comparison</h4>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                        {validationResult.validation.imageComparison}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* GPS Verification */}
              {validationResult.validation.gpsMatch !== null && validationResult.validation.gpsMatch !== undefined && (
                <div className={`rounded-lg p-4 border ${
                  validationResult.validation.gpsMatch 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    <MapPin className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      validationResult.validation.gpsMatch 
                        ? 'text-green-600' 
                        : 'text-yellow-600'
                    }`} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">GPS Location Verification</h4>
                      <div className="space-y-1">
                        <p className={`text-sm font-medium ${
                          validationResult.validation.gpsMatch 
                            ? 'text-green-700' 
                            : 'text-yellow-700'
                        }`}>
                          {validationResult.validation.gpsMatch 
                            ? '✅ Location Verified (Within Tolerance)' 
                            : '⚠️ Location Mismatch'}
                        </p>
                        {validationResult.validation.gpsDistance !== undefined && (
                          <p className="text-xs text-gray-600">
                            Distance: {validationResult.validation.gpsDistance}m from issue location
                            {validationResult.validation.gpsMatch ? ' (within 50m tolerance)' : ' (exceeds 50m tolerance)'}
                          </p>
                        )}
                        {validationResult.validation.gpsWarning && validationResult.validation.gpsWarningMessage && (
                          <p className="text-xs text-yellow-700 mt-2 italic">
                            {validationResult.validation.gpsWarningMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Missing Details */}
              {validationResult.validation.missingDetails && 
               Array.isArray(validationResult.validation.missingDetails) && 
               validationResult.validation.missingDetails.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Missing Details</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {validationResult.validation.missingDetails.map((detail: string, index: number) => (
                          <li key={index}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowValidationModal(false)
                    setValidationResult(null)
                  }}
                  className="px-6 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

