import { useEffect, useState } from 'react'
import { Search, Plus, X, QrCode, Printer, Link as LinkIcon, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { locationsApi, Location } from '../api/locations'
import { sitesApi, SiteSummary } from '../api/sites'
import { useAuthStore } from '../store/authStore'
import { QRCodeSVG } from 'qrcode.react'
import LocationMap from '../components/LocationMap'
import api from '../api/client'

export default function Sites() {
  const { user } = useAuthStore()
  const isFieldStaff = user?.role === 'field-staff'
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSites, setLoadingSites] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedLocationForQR, setSelectedLocationForQR] = useState<Location | null>(null)
  const [publicUrl, setPublicUrl] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    siteId: '',
    locationCode: '',
    shortCode: '',
    area: '',
    city: '',
    address: '',
    url: '',
    timeZone: 'UTC',
    latitude: '',
    longitude: '',
    enabled: true,
  })
  const [links, setLinks] = useState<string[]>([''])
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSites()
    loadPublicUrl()
  }, [])

  const loadPublicUrl = async () => {
    try {
      const { data } = await api.get<{ publicUrl?: string }>('/config')
      if (data.publicUrl) {
        setPublicUrl(data.publicUrl)
      } else {
        // Fallback to current origin
        setPublicUrl(window.location.origin)
      }
    } catch (error) {
      // Fallback to current origin if config fails
      setPublicUrl(window.location.origin)
    }
  }

  useEffect(() => {
    if (selectedSiteId) {
      loadLocations()
    } else {
      setLocations([])
      setLoading(false)
    }
  }, [selectedSiteId])

  const loadSites = async () => {
    try {
      const data = await sitesApi.getAll()
      setSites(data)
      if (data.length > 0 && !selectedSiteId) {
        setSelectedSiteId(data[0]._id)
      }
    } catch (error: any) {
      toast.error('Failed to load sites')
    } finally {
      setLoadingSites(false)
    }
  }

  const loadLocations = async () => {
    if (!selectedSiteId) return
    setLoading(true)
    try {
      const data = await locationsApi.getAll(selectedSiteId)
      setLocations(data)
    } catch (error: any) {
      toast.error('Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      siteId: '',
      locationCode: '',
      shortCode: '',
      area: '',
      city: '',
      address: '',
      url: '',
      timeZone: 'UTC',
      latitude: '',
      longitude: '',
      enabled: true,
    })
    setLinks([''])
    setImages([])
    setImagePreviews([])
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (file) {
      const newImages = [...images]
      const newPreviews = [...imagePreviews]
      newImages[index] = file
      newPreviews[index] = URL.createObjectURL(file)
      setImages(newImages)
      setImagePreviews(newPreviews)
    }
  }

  const handleImagePaste = async (e: React.ClipboardEvent<HTMLDivElement>, index: number) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const newImages = [...images]
          const newPreviews = [...imagePreviews]
          newImages[index] = file
          newPreviews[index] = URL.createObjectURL(file)
          setImages(newImages)
          setImagePreviews(newPreviews)
        }
      }
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImages(newImages)
    setImagePreviews(newPreviews)
  }

  const addLink = () => {
    setLinks([...links, ''])
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links]
    newLinks[index] = value
    setLinks(newLinks)
  }

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSiteId) {
      toast.error('Please select a site first')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Location name is required')
      return
    }
    setSubmitting(true)
    try {
      await locationsApi.create({
        name: formData.name.trim(),
        siteId: selectedSiteId,
        locationCode: formData.locationCode.trim() || undefined,
        shortCode: formData.shortCode.trim() || undefined,
        area: formData.area.trim() || undefined,
        city: formData.city.trim() || undefined,
        address: formData.address.trim() || undefined,
        timeZone: formData.timeZone || 'UTC',
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        enabled: formData.enabled,
      })
      toast.success('Location created successfully')
      setIsModalOpen(false)
      resetForm()
      loadLocations()
      setIsModalOpen(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create location')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLocations = locations.filter((location) => {
    const query = searchQuery.toLowerCase()
    return (
      location.name?.toLowerCase().includes(query) ||
      location.locationCode?.toLowerCase().includes(query) ||
      location.shortCode?.toLowerCase().includes(query) ||
      location.city?.toLowerCase().includes(query) ||
      location.area?.toLowerCase().includes(query) ||
      location.address?.toLowerCase().includes(query)
    )
  })

  const handlePrintQR = (location: Location) => {
    setSelectedLocationForQR(location)
    setQrModalOpen(true)
  }

  const printQRCode = () => {
    if (!selectedLocationForQR) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrCode = document.getElementById('qr-code-container')
    if (!qrCode) return

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${selectedLocationForQR.name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
            }
            .qr-code {
              margin: 20px 0;
            }
            .location-info {
              margin-top: 20px;
              text-align: center;
            }
            .location-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .location-code {
              font-size: 18px;
              color: #666;
              margin-bottom: 5px;
            }
            .short-code {
              font-size: 20px;
              font-weight: bold;
              color: #333;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="location-info">
              <div class="location-name">${selectedLocationForQR.name}</div>
              ${selectedLocationForQR.locationCode ? `<div class="location-code">Code: ${selectedLocationForQR.locationCode}</div>` : ''}
              ${selectedLocationForQR.shortCode ? `<div class="short-code">${selectedLocationForQR.shortCode}</div>` : ''}
            </div>
            <div class="qr-code">
              ${qrCode.innerHTML}
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  if (loadingSites || loading) {
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
          <h1 className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">Locations</h1>
          <p className="text-text-mutedLight dark:text-text-mutedDark mt-1">Manage locations for selected site</p>
        </div>
        {!isFieldStaff && (
          <div className="flex items-center space-x-3">
            <button
              className="bg-primary dark:bg-primary-light hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
              onClick={() => {
                if (!selectedSiteId) {
                  toast.error('Please select a site first')
                  return
                }
                setIsModalOpen(true)
              }}
            >
              <Plus className="h-5 w-5" />
              <span>Add Location</span>
            </button>
          </div>
        )}
      </div>

      {/* Site Selection */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
            Select Site <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent appearance-none"
            style={{ colorScheme: 'light dark' }}
          >
            <option value="">-- Select a Site --</option>
            {sites.map((site) => (
              <option key={site._id} value={site._id}>
                {site.name} {site.code ? `(${site.code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
        <input
          type="text"
          placeholder="Search locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {!selectedSiteId ? (
        <div className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl p-12 text-center border border-border-light dark:border-border-dark">
          <p className="text-text-mutedLight dark:text-text-mutedDark">Please select a site to view locations</p>
        </div>
      ) : (
        <>
          {/* Locations Table */}
          <div className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">LOCATION CODE</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">LOCATION NAME</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">COORDINATES</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">ADDRESS</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((location, index) => (
                    <tr
                      key={location._id}
                      className={`border-b border-border-light dark:border-border-dark ${
                        index % 2 === 0
                          ? 'bg-surface-light dark:bg-surface-dark'
                          : 'bg-bg-light dark:bg-bg-dark'
                      } hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm text-text-mainLight dark:text-text-mainDark">
                          {location.locationCode || location.shortCode || 'N/A'}
                        </div>
                        {location.shortCode && location.shortCode !== location.locationCode && (
                          <div className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">
                            Short: {location.shortCode}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-mainLight dark:text-text-mainDark">
                          {location.name}
                        </div>
                        {location.city && (
                          <div className="text-sm text-text-mutedLight dark:text-text-mutedDark">
                            {location.city}{location.area ? `, ${location.area}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {location.loc?.coordinates && location.loc.coordinates[0] !== 0 && location.loc.coordinates[1] !== 0 ? (
                          <div className="text-sm text-text-mainLight dark:text-text-mainDark">
                            <div>Lat: {location.loc.coordinates[1].toFixed(5)}</div>
                            <div>Lng: {location.loc.coordinates[0].toFixed(5)}</div>
                          </div>
                        ) : (
                          <span className="text-text-mutedLight dark:text-text-mutedDark">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-text-mainLight dark:text-text-mainDark max-w-xs truncate">
                          {location.address || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {(location.locationCode || location.shortCode) && (
                            <button
                              onClick={() => handlePrintQR(location)}
                              className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                              title="Print QR Code"
                            >
                              <QrCode className="h-5 w-5 text-primary-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedSiteId && filteredLocations.length === 0 && (
        <div className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl p-12 text-center border border-border-light dark:border-border-dark">
          <p className="text-text-mutedLight dark:text-text-mutedDark">
            {searchQuery ? 'No locations found matching your search' : 'No locations found for this site'}
          </p>
        </div>
      )}

      {/* QR Code Print Modal */}
      {qrModalOpen && selectedLocationForQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setQrModalOpen(false)
              setSelectedLocationForQR(null)
            }}
          ></div>
          <div className="relative bg-white dark:bg-surface-dark shadow-lg rounded-xl w-full max-w-md p-6 border border-border-light dark:border-border-dark">
            <button
              className="absolute top-4 right-4 p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg"
              onClick={() => {
                setQrModalOpen(false)
                setSelectedLocationForQR(null)
              }}
            >
              <X className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
            </button>

            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold text-text-mainLight dark:text-text-mainDark">
                QR Code - {selectedLocationForQR.name}
              </h2>
              
              <div id="qr-code-container" className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG
                  value={publicUrl ? `${publicUrl}/report?location=${selectedLocationForQR._id}&code=${selectedLocationForQR.locationCode || selectedLocationForQR.shortCode || selectedLocationForQR._id}` : ''}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="space-y-2">
                <div className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark">
                  {selectedLocationForQR.name}
                </div>
                {selectedLocationForQR.locationCode && (
                  <div className="text-sm text-text-mutedLight dark:text-text-mutedDark">
                    Code: {selectedLocationForQR.locationCode}
                  </div>
                )}
                {selectedLocationForQR.shortCode && (
                  <div className="text-lg font-mono font-bold text-primary-600">
                    {selectedLocationForQR.shortCode}
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  onClick={printQRCode}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <Printer className="h-5 w-5" />
                  <span>Print QR Code</span>
                </button>
                <button
                  onClick={() => {
                    setQrModalOpen(false)
                    setSelectedLocationForQR(null)
                  }}
                  className="px-6 py-2 border border-border-light dark:border-border-dark text-text-mainLight dark:text-text-mainDark rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-bg-dark overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Create New Location</h2>
            <button
              onClick={() => {
                if (!submitting) {
                  setIsModalOpen(false)
                  resetForm()
                }
              }}
              className="p-2 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Left Side - Form */}
            <div className="w-1/2 overflow-y-auto p-6 border-r border-border-light dark:border-border-dark">
              <form className="space-y-4" onSubmit={handleCreateSite}>
                {/* Location Code */}
                <div>
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                    Location Code
                  </label>
                  <input
                    type="text"
                    value={formData.locationCode}
                    onChange={(e) => setFormData({ ...formData, locationCode: e.target.value.toUpperCase() })}
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="TUS003"
                  />
                </div>

                {/* Location Name */}
                <div>
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Enter location name"
                    required
                  />
                </div>

                {/* Link Field */}
                <div>
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                    Link
                  </label>
                  {links.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => updateLink(index, e.target.value)}
                          disabled={submitting}
                          className="w-full px-4 py-2 pr-10 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                          placeholder="https://..."
                        />
                        <select className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent border-none text-text-mutedLight dark:text-text-mutedDark">
                          <option>Select</option>
                        </select>
                      </div>
                      {links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLink(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLink}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Add Link
                  </button>
                </div>

                {/* Coordinate */}
                <div>
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                    Coordinate
                  </label>
                  <input
                    type="text"
                    value={
                      formData.latitude && formData.longitude
                        ? `${formData.latitude},${formData.longitude}`
                        : ''
                    }
                    onChange={(e) => {
                      const [lat, lng] = e.target.value.split(',')
                      setFormData({
                        ...formData,
                        latitude: lat?.trim() || '',
                        longitude: lng?.trim() || '',
                      })
                    }}
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="12.959535038484356,77.59804334848565"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Enter address"
                  />
                </div>

                {/* Area and City */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                      Area
                    </label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      disabled={submitting}
                      className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="Area"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={submitting}
                      className="w-full px-4 py-2 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="City"
                    />
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="pt-4 border-t border-border-light dark:border-border-dark">
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-3">
                    Image
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className="border-2 border-dashed border-gray-300 dark:border-border-dark rounded-lg p-4 relative"
                        onPaste={(e) => handleImagePaste(e, index)}
                      >
                        {imagePreviews[index] ? (
                          <div className="relative">
                            <img
                              src={imagePreviews[index]}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-center text-sm text-text-mutedLight dark:text-text-mutedDark mb-2">
                              Paste Image (or) Upload file
                            </div>
                            <label className="block">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, index)}
                                className="hidden"
                                disabled={submitting}
                              />
                              <span className="block w-full px-4 py-2 bg-primary-600 text-white text-center rounded-lg hover:bg-primary-700 cursor-pointer text-sm">
                                Browse File
                              </span>
                            </label>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-border-light dark:border-border-dark mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (!submitting) {
                        setIsModalOpen(false)
                        resetForm()
                      }
                    }}
                    disabled={submitting}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
                  >
                    {submitting ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Side - Map */}
            <div className="w-1/2 p-6">
              <LocationMap
                latitude={formData.latitude ? parseFloat(formData.latitude) : 0}
                longitude={formData.longitude ? parseFloat(formData.longitude) : 0}
                onCoordinatesChange={(lat, lng) => {
                  setFormData({
                    ...formData,
                    latitude: lat.toString(),
                    longitude: lng.toString(),
                  })
                }}
                onAddressChange={(addr) => {
                  setFormData({ ...formData, address: addr })
                }}
                address={formData.address}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

