import { useEffect, useState } from 'react'
import { Search, Plus, X, Edit, Trash2, Building2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { sitesApi, SiteSummary } from '../api/sites'
import { useAuthStore } from '../store/authStore'

export default function SitesManagement() {
  const { user } = useAuthStore()
  const isFieldStaff = user?.role === 'field-staff'
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editSiteId, setEditSiteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    timeZone: 'UTC',
    latitude: '',
    longitude: '',
    enabled: true,
    enableSms: false,
    enableGps: false,
  })

  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    try {
      setLoading(true)
      const data = await sitesApi.getAll()
      setSites(data)
    } catch (error: any) {
      toast.error('Failed to load sites')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      timeZone: 'UTC',
      latitude: '',
      longitude: '',
      enabled: true,
      enableSms: false,
      enableGps: false,
    })
    setEditSiteId(null)
  }

  const handleEdit = (site: SiteSummary) => {
    setFormData({
      name: site.name,
      code: site.code || '',
      timeZone: site.timeZone || 'UTC',
      latitude: site.latitude?.toString() || '',
      longitude: site.longitude?.toString() || '',
      enabled: true, // Sites are always enabled
      enableSms: false,
      enableGps: false,
    })
    setEditSiteId(site._id)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Site name is required')
      return
    }

    setSubmitting(true)
    try {
      if (editSiteId) {
        // Update site
        await sitesApi.update(editSiteId, {
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          timeZone: formData.timeZone || 'UTC',
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
          enabled: formData.enabled,
          enableSms: formData.enableSms,
          enableGps: formData.enableGps,
        })
        toast.success('Site updated successfully')
      } else {
        // Create site
        await sitesApi.create({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          timeZone: formData.timeZone || 'UTC',
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
          enabled: formData.enabled,
          enableSms: formData.enableSms,
          enableGps: formData.enableGps,
        })
        toast.success('Site created successfully')
      }
      setIsModalOpen(false)
      resetForm()
      loadSites()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save site')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      return
    }

    try {
      await sitesApi.delete(siteId)
      toast.success('Site deleted successfully')
      loadSites()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete site')
    }
  }

  const filteredSites = sites.filter((site) => {
    const query = searchQuery.toLowerCase()
    return (
      site.name?.toLowerCase().includes(query) ||
      site.code?.toLowerCase().includes(query) ||
      site.location?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">Sites</h1>
          <p className="text-text-mutedLight dark:text-text-mutedDark mt-1">Manage your sites and locations</p>
        </div>
        {!isFieldStaff && (
          <button
            className="bg-primary dark:bg-primary-light hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
          >
            <Plus className="h-5 w-5" />
            <span>Add Site</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
        <input
          type="text"
          placeholder="Search sites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600"
        />
      </div>

      {/* Sites Table */}
      {filteredSites.length > 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">SITE NAME</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">CODE</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">OPEN TICKETS</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">AT RISK</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">RESOLVED</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">AVG RESOLUTION</th>
                  {!isFieldStaff && (
                    <th className="px-6 py-4 text-center text-sm font-semibold">ACTIONS</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredSites.map((site, index) => (
                  <tr
                    key={site._id}
                    className={`border-b border-border-light dark:border-border-dark ${
                      index % 2 === 0
                        ? 'bg-surface-light dark:bg-surface-dark'
                        : 'bg-bg-light dark:bg-bg-dark'
                    } hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-mainLight dark:text-text-mainDark">
                        {site.name}
                      </div>
                      {site.location && (
                        <div className="text-sm text-text-mutedLight dark:text-text-mutedDark">
                          {site.location}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm text-text-mainLight dark:text-text-mainDark">
                        {site.code || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                        {site.openTickets}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm font-medium">
                        {site.atRiskTickets}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                        {site.resolvedTickets}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-mainLight dark:text-text-mainDark">
                        {site.avgResolutionTime}
                      </span>
                    </td>
                    {!isFieldStaff && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(site)}
                            className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Edit site"
                          >
                            <Edit className="h-5 w-5 text-primary-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(site._id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete site"
                          >
                            <Trash2 className="h-5 w-5 text-red-600" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl p-12 text-center border border-border-light dark:border-border-dark">
          <Building2 className="h-12 w-12 text-text-mutedLight dark:text-text-mutedDark mx-auto mb-4" />
          <p className="text-text-mutedLight dark:text-text-mutedDark">
            {searchQuery ? 'No sites found matching your search' : 'No sites found. Create your first site to get started.'}
          </p>
        </div>
      )}

      {/* Add/Edit Site Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!submitting) {
                setIsModalOpen(false)
                resetForm()
              }
            }}
          ></div>
          <div className="relative bg-white dark:bg-surface-dark shadow-lg rounded-xl w-full max-w-2xl p-6 border border-border-light dark:border-border-dark max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg"
              onClick={() => {
                if (!submitting) {
                  setIsModalOpen(false)
                  resetForm()
                }
              }}
            >
              <X className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
            </button>

            <h2 className="text-2xl font-semibold text-text-mainLight dark:text-text-mainDark mb-6">
              {editSiteId ? 'Edit Site' : 'Add New Site'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Site Name */}
              <div>
                <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                  Site Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Enter site name"
                  required
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                  Site Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="SITE001"
                  maxLength={10}
                />
              </div>

              {/* Time Zone */}
              <div>
                <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                  Time Zone
                </label>
                <input
                  type="text"
                  value={formData.timeZone}
                  onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="UTC"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="12.9716"
                    min="-90"
                    max="90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="77.5946"
                    min="-180"
                    max="180"
                  />
                </div>
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  disabled={submitting}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-600"
                />
                <label htmlFor="enabled" className="text-sm text-text-mainLight dark:text-text-mainDark">
                  Enabled
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!submitting) {
                      setIsModalOpen(false)
                      resetForm()
                    }
                  }}
                  disabled={submitting}
                  className="px-6 py-2 border border-border-light dark:border-border-dark text-text-mainLight dark:text-text-mainDark rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editSiteId ? 'Update Site' : 'Create Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

