import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Camera, X, Edit } from 'lucide-react'
import { format, addDays } from 'date-fns'
import DateTimePicker from '../components/DateTimePicker'
import axios from 'axios'

// Create axios instance for public API calls (no auth token)
// Use relative URL for dev (Vite proxy) or same origin, full URL for production if needed
const getApiBaseUrl = () => {
  // In development, Vite proxy handles /api
  if (import.meta.env.DEV) {
    return '/api'
  }
  // In production, use same origin (assuming backend is on same domain or CORS is configured)
  return '/api'
}

const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Add request interceptor for debugging
publicApi.interceptors.request.use(
  (config) => {
    console.log('Public API Request:', config.method?.toUpperCase(), config.url, config.data ? 'with data' : 'no data')
    return config
  },
  (error) => {
    console.error('Public API Request Error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for debugging
publicApi.interceptors.response.use(
  (response) => {
    console.log('Public API Response:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('Public API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data,
    })
    return Promise.reject(error)
  }
)

interface CategoryOption {
  _id: string
  name: string
}

interface DepartmentOption {
  _id: string
  name: string
}

export default function PublicIssueReport() {
  const [searchParams] = useSearchParams()
  const locationCode = searchParams.get('code')
  
  // Set default due date to tomorrow at current time
  const getDefaultDueDate = () => {
    const tomorrow = addDays(new Date(), 1)
    return {
      date: format(tomorrow, 'yyyy-MM-dd'),
      time: format(tomorrow, 'HH:mm')
    }
  }
  
  const defaultDue = getDefaultDueDate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    department: '',
    dueDate: defaultDue.date,
    dueTime: defaultDue.time,
  })
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [locationInfo, setLocationInfo] = useState<{
    locationName: string
    siteName: string
    locationId: string
    siteId: string
  } | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const [descriptionRequired, setDescriptionRequired] = useState(false)
  const [requiresUserInput, setRequiresUserInput] = useState(false)

  useEffect(() => {
    if (locationCode) {
      loadLocationInfo()
    } else {
      toast.error('Invalid QR code. Location code is missing.')
      setLoadingData(false)
    }
  }, [locationCode])

  const loadLocationInfo = async () => {
    try {
      setLoadingData(true)
      // Fetch location info by code
      const { data } = await publicApi.get(`/locations/public/by-code/${locationCode}`);
      
      if (data.location) {
        setLocationInfo({
          locationName: data.location.name,
          siteName: data.location.siteName || 'Unknown Site',
          locationId: data.location._id,
          siteId: data.location.siteId || '',
        })
        
        
        // Load categories and departments for this client
        if (data.location.clientId) {
          try {
            const [catsRes, deptsRes] = await Promise.allSettled([
              publicApi.get(`/categories/public/${data.location.clientId}`),
              publicApi.get(`/departments/public/${data.location.clientId}`),
            ])
            
            if (catsRes.status === 'fulfilled') {
              setCategories(catsRes.value.data || [])
            }
            if (deptsRes.status === 'fulfilled') {
              setDepartments(deptsRes.value.data || [])
            }
          } catch (error) {
            // Silently fail - categories and departments are optional
            console.log('Could not load categories/departments')
          }
        }
      } else {
        toast.error('Location not found')
      }
    } catch (error: any) {
      console.error('Failed to load location info:', error)
      toast.error(error.response?.data?.message || 'Failed to load location information')
    } finally {
      setLoadingData(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB')
      return
    }

    setImage(file)
    // Clear requiresUserInput flag when user uploads new image
    if (requiresUserInput) {
      setRequiresUserInput(false)
      setDescriptionRequired(false)
    }
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!locationInfo) {
      toast.error('Location information is missing')
      return
    }

    // Validate: if requiresUserInput is true, we need either description or image
    if (requiresUserInput || descriptionRequired) {
      const hasDescription = formData.description?.trim()
      const hasImage = image
      
      if (!hasDescription && !hasImage) {
        toast.error('Please provide a description or upload an image to help AI understand the issue.')
        return
      }
    }

    setLoading(true)
    try {
      // Validate form data structure (basic validation - backend will do full validation)
      if (!formData.description?.trim() && !image) {
        toast.error('Please provide a description or upload an image')
        setLoading(false)
        return
      }

      const submitData = new FormData()
      submitData.append('locationId', locationInfo.locationId)
      if (locationInfo.siteId) {
        submitData.append('siteId', locationInfo.siteId)
      }
      submitData.append('title', formData.title || '')
      submitData.append('description', formData.description || '')
      submitData.append('priority', formData.priority)
      if (formData.category) submitData.append('category', formData.category)
      if (formData.department) submitData.append('department', formData.department)
      if (formData.dueDate && formData.dueTime) {
        const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`)
        submitData.append('dueDate', dueDateTime.toISOString())
      }
      if (image) submitData.append('image', image)

      const response = await publicApi.post('/issues/public', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Display the response message if available, otherwise show default message
      const successMessage = response.data?.message || 'Issue reported successfully!'
      toast.success(successMessage, { duration: 6000 })
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        department: '',
        dueDate: defaultDue.date,
        dueTime: defaultDue.time,
      })
      setImage(null)
      setImagePreview(null)
      setDescriptionRequired(false)
      setRequiresUserInput(false)
    } catch (error: any) {
      console.error('Failed to submit issue:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        request: error.request,
        config: error.config,
      })
      
      // Check if it's a network error (request never reached server)
      if (!error.response) {
        if (error.request) {
          toast.error('Network error: Could not reach server. Please check your connection.')
        } else {
          toast.error('Request error: Failed to send request to server.')
        }
        return
      }
      
      const errorCode = error.response?.data?.code
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit issue'
      
      // If AI requires user input, force user to enter description or upload new image
      if (errorCode === 'REQUIRES_USER_INPUT' || errorCode === 'AI_NEEDS_DESCRIPTION' || errorCode === 'DESCRIPTION_OR_IMAGE_REQUIRED') {
        setRequiresUserInput(true)
        const hasDescription = formData.description?.trim()
        const hasImage = image
        
        // If we have image but no description, require description
        if (hasImage && !hasDescription) {
          setDescriptionRequired(true)
        } else if (!hasImage && !hasDescription) {
          // If we have neither, require at least one
          setDescriptionRequired(true)
        }
        
        toast.error(errorMessage, { duration: 5000 })
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDateTimeSelect = (dateTimeString: string) => {
    if (dateTimeString) {
      const dateTime = new Date(dateTimeString)
      setFormData({
        ...formData,
        dueDate: format(dateTime, 'yyyy-MM-dd'),
        dueTime: format(dateTime, 'HH:mm'),
      })
    }
    setShowDateTimePicker(false)
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-text-mainLight dark:text-text-mainDark">Loading location information...</p>
        </div>
      </div>
    )
  }

  if (!locationInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="text-center">
          <p className="text-text-mainLight dark:text-text-mainDark text-lg mb-4">Location not found</p>
          <p className="text-text-mutedLight dark:text-text-mutedDark">The QR code may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark p-6">
          <h1 className="text-2xl font-bold text-text-mainLight dark:text-text-mainDark mb-2">
            Report an Issue
          </h1>
          <p className="text-text-mutedLight dark:text-text-mutedDark mb-6">
            Site: <span className="font-semibold text-text-mainLight dark:text-text-mainDark">{locationInfo.siteName}</span>
            {' • '}
            Location: <span className="font-semibold text-text-mainLight dark:text-text-mainDark">{locationInfo.locationName}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Brief title for the issue"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                Description {descriptionRequired && <span className="text-red-500">*</span>}
                {false && (
                  <span className="text-xs font-normal text-green-500 ml-2">(Optional - AI classified from image)</span>
                )}
                {descriptionRequired && (
                  <span className="text-xs font-normal text-red-500 ml-2">(Required - AI needs more context)</span>
                )}
              </label>
              <div className="relative">
                <textarea
                  id="description"
                  required={descriptionRequired}
                  rows={6}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    // Clear required flag once user starts typing
                    if (descriptionRequired && e.target.value.trim()) {
                      setDescriptionRequired(false)
                    }
                  }}
                  className={`w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none ${
                    descriptionRequired 
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
                  : false
                  ? 'Optional - AI successfully classified the issue from your image'
                  : 'Optional - Provide additional details about the issue. AI will process it automatically.'}
              </p>
            </div>

            {/* Image Upload */}
            <div>
              <label htmlFor="image" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                Image
                {requiresUserInput && !image && (
                  <span className="text-xs font-normal text-red-500 ml-2">(Upload new image or provide description)</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="image"
                  className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg cursor-pointer hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setImage(null)
                          setImagePreview(null)
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-text-mutedLight dark:text-text-mutedDark mx-auto mb-2" />
                      <span className="text-sm text-text-mutedLight dark:text-text-mutedDark">
                        Click to upload image
                      </span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Category and Department */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                  Department
                </label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                Due Date
              </label>
              {showDateTimePicker && (
                <DateTimePicker
                  value={formData.dueDate && formData.dueTime ? new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString() : ''}
                  onChange={handleDateTimeSelect}
                  onClose={() => setShowDateTimePicker(false)}
                />
              )}
              <div className="relative">
                <input
                  type="text"
                  id="dueDateDisplay"
                  readOnly
                  value={formData.dueDate && formData.dueTime ? format(new Date(`${formData.dueDate}T${formData.dueTime}`), 'dd-MM-yyyy hh:mm a') : ''}
                  onClick={() => setShowDateTimePicker(true)}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent cursor-pointer"
                  placeholder="Select due date and time"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Submitting...' : 'Submit Issue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
  )
}

