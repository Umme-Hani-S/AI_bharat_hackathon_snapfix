import { useEffect, useState } from 'react'
import { Tag, Search, Plus, MoreVertical, Edit, Trash2, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { categoriesApi, CategorySummary } from '../api/categories'
import { useAuthStore } from '../store/authStore'

export default function Categories() {
  const { user } = useAuthStore()
  const isFieldStaff = user?.role === 'field-staff'
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll()
      setCategories(data)
    } catch (error: any) {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }
    setSubmitting(true)
    try {
      await categoriesApi.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      })
      toast.success('Category created successfully')
      setIsModalOpen(false)
      setFormData({ name: '', description: '' })
      loadCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create category')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">Categories</h1>
          <p className="text-text-mutedLight dark:text-text-mutedDark mt-1">Manage ticket categories and subcategories</p>
        </div>
        {!isFieldStaff && (
          <button
            className="bg-primary dark:bg-primary-light hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-5 w-5" />
            <span>New Category</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <div
            key={category._id}
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6 hover:border-primary transition-colors shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <Tag 
                    className="h-6 w-6" 
                    style={{ color: category.color }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark">{category.name}</h3>
                  <p className="text-sm text-text-mutedLight dark:text-text-mutedDark">{category.ticketCount} tickets</p>
                </div>
              </div>
              {!isFieldStaff && (
                <div className="relative group">
                  <button className="p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg">
                    <MoreVertical className="h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
                  </button>
                  <div className="absolute right-0 top-8 hidden group-hover:block bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg z-10 min-w-[120px]">
                    <button className="w-full text-left px-4 py-2 text-sm text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark flex items-center space-x-2">
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-bg-light dark:hover:bg-bg-dark flex items-center space-x-2">
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {category.description && (
              <p className="text-sm text-text-mutedLight dark:text-text-mutedDark mb-4">{category.description}</p>
            )}

            <div className="pt-4 border-t border-border-light dark:border-border-dark">
              <p className="text-xs text-text-mutedLight dark:text-text-mutedDark">Created from live data</p>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-12 text-center shadow-sm">
          <p className="text-text-mutedLight dark:text-text-mutedDark">No categories found</p>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!submitting) {
                setIsModalOpen(false)
                setFormData({ name: '', description: '' })
              }
            }}
          ></div>
          <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl w-full max-w-lg p-6 space-y-6 shadow-lg">
            <button
              className="absolute top-4 right-4 p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg"
              onClick={() => {
                if (!submitting) {
                  setIsModalOpen(false)
                  setFormData({ name: '', description: '' })
                }
              }}
              aria-label="Close add category form"
            >
              <X className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
            </button>

            <div>
              <h2 className="text-2xl font-semibold text-text-mainLight dark:text-text-mainDark">Add Category</h2>
              <p className="text-text-mutedLight dark:text-text-mutedDark">
                Create a new ticket category to help teams classify issues.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleCreateCategory}>
              <div>
                <label className="block text-sm text-text-mutedLight dark:text-text-mutedDark mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-text-mutedLight dark:text-text-mutedDark mb-2">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  placeholder="Brief description (optional)"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-border-light dark:border-border-dark text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark shadow-sm"
                  onClick={() => {
                    if (!submitting) {
                      setIsModalOpen(false)
                      setFormData({ name: '', description: '' })
                    }
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary dark:bg-primary-light hover:bg-primary-dark text-white transition-colors disabled:opacity-60 shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

