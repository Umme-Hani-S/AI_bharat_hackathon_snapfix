import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { issuesApi } from '../api/issues'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Camera, X, Edit, MapPin } from 'lucide-react'
import { sitesApi } from '../api/sites'
import { categoriesApi } from '../api/categories'
import { departmentsApi } from '../api/departments'
import { usersApi } from '../api/users'
import { format } from 'date-fns'
import DateTimePicker from '../components/DateTimePicker'

interface SiteOption {
  _id: string
  name: string
}

interface CategoryOption {
  _id: string
  name: string
}

interface DepartmentOption {
  _id: string
  name: string
}

interface UserOption {
  _id: string
  name: string
  email: string
  departmentIds?: string[]
}

export default function IssueReport() {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    site: '',
    title: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    department: '',
    assignedTo: '',
    dueDate: '', // Optional - AI will predict or default to 1 day
    dueTime: '',
  })
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sites, setSites] = useState<SiteOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [departmentUsers, setDepartmentUsers] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const [descriptionRequired, setDescriptionRequired] = useState(false)
  const [requiresUserInput, setRequiresUserInput] = useState(false)
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [capturingGps, setCapturingGps] = useState(false)

  useEffect(() => {
    loadFormData()
    // Load users separately - this may fail for non-admin users, which is okay
    loadUsers().catch(() => {
      // Silently handle - users API is only available to admins
    })
    // Capture GPS location on component mount
    captureGpsLocation()
  }, [])

  const captureGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please enable location services.')
      return
    }

    setCapturingGps(true)
    setGpsError(null)

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

  // Load users when department changes
  useEffect(() => {
    if (formData.department) {
      loadDepartmentUsers(formData.department)
    } else {
      setDepartmentUsers([])
      setFormData(prev => ({ ...prev, assignedTo: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.department])

  const loadFormData = async () => {
    try {
      setLoadingData(true)
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        sitesApi.getAll(),
        categoriesApi.getAll(),
        departmentsApi.getAll(),
      ])

      let hasErrors = false
      const errorMessages: string[] = []

      // Handle sites
      if (results[0].status === 'fulfilled') {
        setSites(results[0].value.map((site) => ({ _id: site._id, name: site.name })))
      } else {
        const error = results[0].reason
        console.error('Failed to load sites:', error)
        if (error?.response?.status !== 403 && error?.response?.status !== 401) {
          hasErrors = true
          errorMessages.push('sites')
        }
      }

      // Handle categories
      if (results[1].status === 'fulfilled') {
        setCategories(results[1].value.map((category) => ({ _id: category._id, name: category.name })))
      } else {
        const error = results[1].reason
        console.error('Failed to load categories:', error)
        if (error?.response?.status !== 403 && error?.response?.status !== 401) {
          hasErrors = true
          errorMessages.push('categories')
        }
      }

      // Handle departments
      if (results[2].status === 'fulfilled') {
        setDepartments(results[2].value.map((dept) => ({ _id: dept._id, name: dept.name })))
      } else {
        const error = results[2].reason
        console.error('Failed to load departments:', error)
        if (error?.response?.status !== 403 && error?.response?.status !== 401) {
          hasErrors = true
          errorMessages.push('departments')
        }
      }

      // Show consolidated error message if any non-permission errors occurred
      if (hasErrors && errorMessages.length > 0) {
        toast.error(`Failed to load: ${errorMessages.join(', ')}`)
      }
    } catch (error: any) {
      console.error('Unexpected error loading form data:', error)
      // Only show error if it's not a permission or auth issue
      if (error?.response?.status !== 403 && error?.response?.status !== 401) {
        toast.error(error.response?.data?.message || 'Failed to load form data. Please refresh the page.')
      }
    } finally {
      setLoadingData(false)
    }
  }

  const loadUsers = async () => {
    try {
      const usersData = await usersApi.getAll()
      setAllUsers(usersData.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        departmentIds: user.departmentIds || [],
      })))
    } catch (error: any) {
      // Silently fail - users might not be accessible for all roles (e.g., field-staff, tenants, vendors)
      // Only admins, super admins, and client admins can view users
      if (error.response?.status !== 403) {
        console.error('Failed to load users:', error)
      }
    }
  }

  const loadDepartmentUsers = async (departmentId: string) => {
    setLoadingUsers(true)
    try {
      // If we don't have users loaded yet, try to load them first
      if (allUsers.length === 0) {
        await loadUsers()
      }
      
      // Filter users who have this department in their departmentIds
      const usersInDepartment = allUsers.filter((user) =>
        user.departmentIds?.includes(departmentId)
      )
      setDepartmentUsers(usersInDepartment)
      
      // Clear assignedTo if the selected user is not in the new department
      if (formData.assignedTo && !usersInDepartment.find(u => u._id === formData.assignedTo)) {
        setFormData(prev => ({ ...prev, assignedTo: '' }))
      }
    } catch (error: any) {
      console.error('Failed to load department users:', error)
      // Don't show error toast - users might not have permission
      setDepartmentUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    if (image) {
      toast.error('Only one image can be uploaded for now')
      return
    }
    setImage(file)
    // Clear requiresUserInput flag when user uploads new image
    if (requiresUserInput) {
      setRequiresUserInput(false)
      setDescriptionRequired(false)
    }
    
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImage(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: Site is required
    if (!formData.site) {
      toast.error('Please select a site')
      return
    }
    
    // Validation: GPS location is required
    if (!gpsLocation) {
      toast.error('GPS location is required. Please allow location access and try again.')
      captureGpsLocation()
      return
    }
    
    // Validation: if requiresUserInput is true, we need either description or image
    if (requiresUserInput || descriptionRequired) {
      const hasDescription = formData.description?.trim()
      const hasImage = image
      
      if (!hasDescription && !hasImage) {
        toast.error('Please provide a description or upload an image to help AI understand the issue.')
        return
      }
    }
    
    // Validate due date is not in the past (only if provided)
    if (formData.dueDate && formData.dueTime) {
      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`)
      if (dueDateTime < new Date()) {
        toast.error('Due date cannot be in the past')
        setShowDateTimePicker(true)
        return
      }
    }
    
    setLoading(true)

    try {
      // Combine date and time into ISO string
      const dueDateTime = formData.dueDate && formData.dueTime 
        ? new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString()
        : undefined

      // Prepare data for validation
      const issueData = {
        title: formData.title || undefined,
        description: formData.description,
        priority: formData.priority,
        siteId: formData.site || undefined,
        category: formData.category || undefined,
        department: formData.department || undefined,
        assignedTo: formData.assignedTo || undefined,
        dueDate: dueDateTime,
        image: image || undefined,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
      }

      // Validate with Zod before sending (API will also validate, but this catches errors early)
      // Note: The API create method will validate using Zod schemas
      const issue = await issuesApi.create(issueData)
      toast.success('Ticket created successfully!')
      // Reset requiresUserInput flags on success
      setRequiresUserInput(false)
      setDescriptionRequired(false)
      navigate(`/tickets/${issue._id}`)
    } catch (error: any) {
      const errorCode = error.response?.data?.code
      let errorMessage = error.response?.data?.message || error.message || 'Failed to create ticket'
      
      // Handle validation errors (from Zod or backend)
      if (errorMessage.includes('Either a description or an image is required')) {
        setRequiresUserInput(true)
        setDescriptionRequired(true)
        errorMessage = 'Please provide either a description or upload an image to create the issue.'
      } else if (errorMessage.includes('Description is required')) {
        setDescriptionRequired(true)
        errorMessage = 'Please provide a description or upload an image to create the issue.'
      } else if (errorCode === 'GPS_REQUIRED' || errorMessage.includes('GPS location is required')) {
        errorMessage = 'GPS location is required. Please allow location access and try again.'
        captureGpsLocation()
      } else if (errorCode === 'INVALID_GPS' || errorCode === 'INVALID_GPS_RANGE') {
        errorMessage = 'Invalid GPS coordinates. Please try capturing location again.'
        captureGpsLocation()
      } else if (errorCode === 'REQUIRES_USER_INPUT' || errorCode === 'AI_NEEDS_DESCRIPTION' || errorCode === 'DESCRIPTION_OR_IMAGE_REQUIRED') {
        setRequiresUserInput(true)
        const hasDescription = formData.description?.trim()
        const hasImage = image
        
        // If we have image but no description, require description
        if (hasImage && !hasDescription) {
          setDescriptionRequired(true)
          errorMessage = 'AI could not process the image. Please provide a description to help AI understand the issue better.'
        } else if (!hasImage && !hasDescription) {
          // If we have neither, require at least one
          setDescriptionRequired(true)
          errorMessage = 'Please provide a description or upload an image to help AI understand the issue.'
        } else {
          errorMessage = 'AI needs more information. Please provide a description or upload an image.'
        }
      } else if (errorCode === 'IMAGE_UNCLEAR') {
        setRequiresUserInput(true)
        setDescriptionRequired(true)
        errorMessage = 'The provided image is unclear or cannot be analyzed. Please provide a clearer image or add a description.'
      } else if (errorCode === 'REQUIRES_USER_INPUT_REPEATED') {
        setRequiresUserInput(true)
        setDescriptionRequired(true)
        errorMessage = 'This image has been submitted multiple times. Please provide a description or submit a different image.'
      }
      
      toast.error(errorMessage, { duration: 6000 })
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">Create Ticket</h1>
          <p className="text-text-mutedLight dark:text-text-mutedDark mt-1">Report an issue with photos or text</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-text-mainLight dark:text-text-mainDark mb-6">Ticket Details</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GPS Location Status */}
          <div className="mb-4 p-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className={`h-5 w-5 ${gpsLocation ? 'text-green-500' : gpsError ? 'text-red-500' : 'text-text-mutedLight dark:text-text-mutedDark'}`} />
                <div>
                  <p className="text-sm font-medium text-text-mainLight dark:text-text-mainDark">
                    GPS Location {gpsLocation ? '(Captured)' : '(Required)'}
                  </p>
                  {gpsLocation ? (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Lat: {gpsLocation.latitude.toFixed(6)}, Lng: {gpsLocation.longitude.toFixed(6)}
                    </p>
                  ) : gpsError ? (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{gpsError}</p>
                  ) : capturingGps ? (
                    <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">Capturing location...</p>
                  ) : (
                    <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">Click to capture location</p>
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

          {/* Site - Required */}
          <div>
            <label htmlFor="site" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
              Site <span className="text-red-500">*</span>
            </label>
            <select
              id="site"
              required
              value={formData.site}
              onChange={(e) => setFormData({ ...formData, site: e.target.value })}
              className={`w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent appearance-none ${
                formData.site 
                  ? 'text-text-mainLight dark:text-text-mainDark' 
                  : 'text-text-mutedLight dark:text-text-mutedDark'
              }`}
            >
              <option value="" disabled>
                Select a site
              </option>
              {sites.map((site) => (
                <option key={site._id} value={site._id}>
                  {site.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">
              Required - AI cannot determine site from images
            </p>
          </div>

          {/* Photos - Optional */}
          <div>
            <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
              Photo {requiresUserInput && !image && (
                <span className="text-xs font-normal text-red-500 ml-2">(Upload new image or provide description)</span>
              )}
            </label>
            <div className="space-y-4">
              {imagePreview && (
                <div className="relative group w-full md:w-1/2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg border border-border-light dark:border-border-dark"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {!image && (
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg cursor-pointer hover:border-primary-600 transition-colors bg-surface-light dark:bg-surface-dark">
                  <div className="flex flex-col items-center justify-center">
                    <Camera className="h-8 w-8 text-text-mutedLight dark:text-text-mutedDark mb-2" />
                    <span className="text-sm text-text-mainLight dark:text-text-mainDark">Add Image</span>
                    <span className="text-xs text-text-mutedLight dark:text-text-mutedDark">(1 image max for now)</span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">
              {requiresUserInput && !image
                ? 'AI needs more information. Please upload an image or provide a more detailed description.'
                : 'Images help AI classify issues faster and provide context to your team'}
            </p>
          </div>

          {/* Title - Optional */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
              Title (Optional - AI will generate if not provided)
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              placeholder="Brief description of the issue"
            />
          </div>

          {/* Description - Optional, Required only if AI fails */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
              Description {(requiresUserInput || descriptionRequired) && <span className="text-red-500">*</span>}
              {(requiresUserInput || descriptionRequired) && (
                <span className="text-xs font-normal text-red-500 ml-2">(Required - AI needs more context)</span>
              )}
              {!image && !requiresUserInput && !descriptionRequired && (
                <span className="text-xs font-normal text-text-mutedLight dark:text-text-mutedDark ml-2">(Optional)</span>
              )}
            </label>
            <div className="relative">
              <textarea
                id="description"
                required={requiresUserInput || descriptionRequired || false}
                rows={6}
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value })
                  // Clear required flag once user starts typing
                  if ((requiresUserInput || descriptionRequired) && e.target.value.trim()) {
                    setRequiresUserInput(false)
                    setDescriptionRequired(false)
                  }
                }}
                className={`w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none ${
                  (requiresUserInput || descriptionRequired)
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-border-light dark:border-border-dark'
                }`}
                placeholder="Describe the issue in detail..."
              />
              <Edit className="absolute bottom-3 right-3 h-4 w-4 text-text-mutedLight dark:text-text-mutedDark" />
            </div>
            <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">
              {requiresUserInput || descriptionRequired
                ? 'AI could not process the issue. Please provide a description or upload a new image to help AI understand the issue better.'
                : 'Optional - Provide additional details about the issue'}
            </p>
          </div>

      

          {/* Category - Optional */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
              Category (Optional - AI will detect from images)
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent appearance-none"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority - Optional */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
              Priority (Optional - AI will assess)
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value as any })
              }
              className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent appearance-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Department - Optional */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
              Department (Optional)
            </label>
            <select
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value, assignedTo: '' })}
              className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent appearance-none"
            >
              <option value="">Select a department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To - Optional, only shown when department is selected */}
          {formData.department && (
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                Assign To (Optional)
                <span className="text-xs font-normal text-text-mutedLight dark:text-text-mutedDark ml-2">
                  - Select a user from the department
                </span>
              </label>
              {loadingUsers ? (
                <div className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                  <span className="text-sm text-text-mutedLight dark:text-text-mutedDark">Loading users...</span>
                </div>
              ) : (
                <select
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent appearance-none"
                >
                  <option value="">Unassigned (assign to department only)</option>
                  {departmentUsers.length === 0 ? (
                    <option value="" disabled>
                      No users found in this department
                    </option>
                  ) : (
                    departmentUsers.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))
                  )}
                </select>
              )}
              <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">
                {departmentUsers.length === 0
                  ? 'No users are assigned to this department'
                  : `${departmentUsers.length} user(s) available in this department`}
              </p>
            </div>
          )}

          {/* Due Date - Optional */}
          <div className="relative">
            <label htmlFor="dueDate" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
              Due Date <span className="text-text-mutedLight dark:text-text-mutedDark text-xs">(Optional)</span>
            </label>
            <div
              onClick={() => setShowDateTimePicker(true)}
              className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border-2 border-purple-500 dark:border-purple-600 rounded-lg text-text-mainLight dark:text-text-mainDark cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              {formData.dueDate && formData.dueTime ? (
                format(new Date(`${formData.dueDate}T${formData.dueTime}`), 'dd-MM-yyyy hh:mm a')
              ) : (
                <span className="text-text-mutedLight dark:text-text-mutedDark">Select date and time (AI will auto-assign if not provided)</span>
              )}
            </div>
            {showDateTimePicker && (
              <DateTimePicker
                value={formData.dueDate && formData.dueTime ? new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString() : ''}
                onChange={(dateTime) => {
                  const date = new Date(dateTime)
                  setFormData({
                    ...formData,
                    dueDate: format(date, 'yyyy-MM-dd'),
                    dueTime: format(date, 'HH:mm'),
                  })
                }}
                onClose={() => setShowDateTimePicker(false)}
                minDate={new Date()}
              />
            )}
            <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">
              Optional - AI will predict based on priority, or default to 1 day if not provided
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Ticket</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
