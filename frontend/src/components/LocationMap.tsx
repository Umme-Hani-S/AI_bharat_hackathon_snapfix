import { useState, useEffect, useRef } from 'react'
import { Search, MapPin } from 'lucide-react'
import api from '../api/client'

interface LocationMapProps {
  latitude: number
  longitude: number
  onCoordinatesChange: (lat: number, lng: number) => void
  onAddressChange: (address: string) => void
  address: string
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export default function LocationMap({
  latitude,
  longitude,
  onCoordinatesChange,
  onAddressChange,
  address,
}: LocationMapProps) {
  const [mapAddress, setMapAddress] = useState(address)
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap')
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const autocompleteRef = useRef<any>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const lastReverseGeocodedRef = useRef<{ lat: number; lng: number } | null>(null)
  const reverseGeocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scriptLoadedRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch Google Maps API key from backend
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data } = await api.get<{ googleMapsApiKey: string | null }>('/config')
        if (data.googleMapsApiKey) {
          setApiKey(data.googleMapsApiKey)
        } else {
          console.warn('Google Maps API key not configured on server')
        }
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error)
        // Fallback to environment variable if available
        const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        if (envKey) {
          setApiKey(envKey)
        }
      }
    }
    fetchApiKey()
  }, [])

  // Load Google Maps JavaScript API
  useEffect(() => {
    if (!apiKey || scriptLoadedRef.current) return

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      scriptLoadedRef.current = true
      initializeMap()
      return
    }

    // Load the script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      scriptLoadedRef.current = true
      initializeMap()
    }
    script.onerror = () => {
      console.error('Failed to load Google Maps script')
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
      if (existingScript) {
        // Don't remove if other components might be using it
      }
    }
  }, [apiKey])

  // Initialize map when API is loaded
  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return

    const lat = (latitude && latitude !== 0) ? latitude : 12.9716 // Default to Bangalore
    const lng = (longitude && longitude !== 0) ? longitude : 77.5946

    const mapOptions = {
      center: { lat, lng },
      zoom: 15,
      mapTypeId: mapType === 'satellite' ? window.google.maps.MapTypeId.SATELLITE : window.google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    }

    // Create map instance
    const map = new window.google.maps.Map(mapRef.current, mapOptions)
    mapInstanceRef.current = map

    // Add marker
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    })
    markerRef.current = marker

    // Initialize Places Autocomplete for search input
    if (searchInputRef.current && window.google.maps.places) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          types: ['geocode', 'establishment'],
          fields: ['geometry', 'formatted_address', 'name', 'place_id'],
        }
      )
      autocompleteRef.current = autocomplete

      // Handle place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const address = place.formatted_address || place.name || ''

          // Update marker position
          marker.setPosition({ lat, lng })
          map.setCenter({ lat, lng })
          map.setZoom(15)

          // Update coordinates and address
          onCoordinatesChange(lat, lng)
          onAddressChange(address)
          setMapAddress(address)
          setSearchQuery(address)
        }
      })
    }

    // Handle map click
    map.addListener('click', (e: any) => {
      const clickedLat = e.latLng.lat()
      const clickedLng = e.latLng.lng()
      
      // Update marker position
      marker.setPosition({ lat: clickedLat, lng: clickedLng })
      
      // Update coordinates
      onCoordinatesChange(clickedLat, clickedLng)
    })

    // Handle marker drag
    marker.addListener('dragend', (e: any) => {
      const draggedLat = e.latLng.lat()
      const draggedLng = e.latLng.lng()
      
      // Update coordinates
      onCoordinatesChange(draggedLat, draggedLng)
    })
  }

  // Update map when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return

    const lat = (latitude && latitude !== 0) ? latitude : 12.9716
    const lng = (longitude && longitude !== 0) ? longitude : 77.5946

    const newPosition = { lat, lng }
    
    // Update map center and marker position
    mapInstanceRef.current.setCenter(newPosition)
    markerRef.current.setPosition(newPosition)
  }, [latitude, longitude])

  // Update map type
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const mapTypeId = mapType === 'satellite' 
      ? window.google?.maps?.MapTypeId.SATELLITE 
      : window.google?.maps?.MapTypeId.ROADMAP
    
    if (mapTypeId) {
      mapInstanceRef.current.setMapTypeId(mapTypeId)
    }
  }, [mapType])

  // Get user's current location if coordinates are not set
  useEffect(() => {
    // Only request location if coordinates are not set (0 or empty)
    const hasCoordinates = latitude && longitude && latitude !== 0 && longitude !== 0
    
    if (!hasCoordinates && navigator.geolocation) {
      requestCurrentLocation()
    }
  }, []) // Only run once on mount

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        // Update parent component with current location
        onCoordinatesChange(lat, lng)
        setIsLocating(false)
      },
      (error) => {
        console.warn('Geolocation error:', error.message)
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  useEffect(() => {
    setMapAddress(address)
  }, [address])

  // Reverse geocode when coordinates change (from map click or other sources)
  useEffect(() => {
    // Only reverse geocode if coordinates are valid and different from last reverse geocoded
    const hasValidCoordinates = latitude && longitude && latitude !== 0 && longitude !== 0
    
    if (hasValidCoordinates && apiKey) {
      // Check if we've already reverse geocoded these coordinates
      const lastCoords = lastReverseGeocodedRef.current
      if (lastCoords && lastCoords.lat === latitude && lastCoords.lng === longitude) {
        return // Already reverse geocoded these coordinates
      }

      // Debounce reverse geocoding to avoid too many API calls
      if (reverseGeocodeTimeoutRef.current) {
        clearTimeout(reverseGeocodeTimeoutRef.current)
      }

      reverseGeocodeTimeoutRef.current = setTimeout(() => {
        reverseGeocode(latitude, longitude)
      }, 500) // Wait 500ms after coordinate change
    }

    return () => {
      if (reverseGeocodeTimeoutRef.current) {
        clearTimeout(reverseGeocodeTimeoutRef.current)
      }
    }
  }, [latitude, longitude, apiKey])

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!apiKey) {
      return
    }

    // Skip if we've already reverse geocoded these exact coordinates
    const lastCoords = lastReverseGeocodedRef.current
    if (lastCoords && lastCoords.lat === lat && lastCoords.lng === lng) {
      return
    }

    setIsReverseGeocoding(true)
    try {
      // Use Google Maps Reverse Geocoding API
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      
      const response = await fetch(geocodeUrl)
      const data = await response.json()

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const formattedAddress = data.results[0].formatted_address
        // Update address with formatted address from Google
        onAddressChange(formattedAddress)
        setMapAddress(formattedAddress)
        // Remember we've reverse geocoded these coordinates
        lastReverseGeocodedRef.current = { lat, lng }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
    } finally {
      setIsReverseGeocoding(false)
    }
  }

  // Handle search input changes for autocomplete
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setMapAddress(value)
  }

  const handleSearch = async () => {
    if (!mapAddress.trim()) {
      return
    }

    if (!apiKey) {
      console.error('Google Maps API key not available')
      return
    }

    setIsGeocoding(true)
    try {
      // Use Google Maps Geocoding API
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(mapAddress.trim())}&key=${apiKey}`
      
      const response = await fetch(geocodeUrl)
      const data = await response.json()

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0]
        const location = result.geometry.location
        const lat = location.lat
        const lng = location.lng
        const formattedAddress = result.formatted_address

        // Update coordinates
        onCoordinatesChange(lat, lng)
        // Update address with formatted address from Google
        onAddressChange(formattedAddress)
        setMapAddress(formattedAddress)
        setSearchQuery(formattedAddress)
      } else {
        console.error('Geocoding failed:', data.status, data.error_message)
        // Still update the address even if geocoding fails
        onAddressChange(mapAddress.trim())
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      // Still update the address even if geocoding fails
      onAddressChange(mapAddress.trim())
    } finally {
      setIsGeocoding(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
      {/* Map Type Tabs */}
      <div className="flex border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => setMapType('roadmap')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            mapType === 'roadmap'
              ? 'bg-primary-600 text-white'
              : 'bg-surface-light dark:bg-surface-dark text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark'
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            mapType === 'satellite'
              ? 'bg-primary-600 text-white'
              : 'bg-surface-light dark:bg-surface-dark text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark'
          }`}
        >
          Satellite
        </button>
      </div>

      {/* Search on Map */}
      <div className="p-3 border-b border-border-light dark:border-border-dark">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-mutedLight dark:text-text-mutedDark z-10" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              placeholder="Search on Map"
              className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
            {/* Google Places Autocomplete will handle suggestions automatically via the input */}
          </div>
          <button
            onClick={requestCurrentLocation}
            disabled={isLocating}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Use my current location"
          >
            <MapPin className="h-4 w-4" />
            {isLocating ? 'Locating...' : 'My Location'}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="flex-1 relative min-h-[400px]">
        {!apiKey && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-text-mutedLight dark:text-text-mutedDark">
                {apiKey === null 
                  ? 'Loading map...' 
                  : 'Google Maps API key not configured'}
              </p>
            </div>
          </div>
        )}
        {isLocating && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 bg-opacity-50 z-10">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-text-mutedLight dark:text-text-mutedDark">
                Getting your location...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Address Search Bar */}
      <div className="p-3 border-t border-border-light dark:border-border-dark">
        <div className="flex gap-2">
          <input
            type="text"
            value={mapAddress}
            onChange={(e) => setMapAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search address..."
            className="flex-1 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary-600"
          />
          <button
            onClick={handleSearch}
            disabled={isGeocoding || !mapAddress.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeocoding ? 'Searching...' : 'Apply'}
          </button>
        </div>
        {isReverseGeocoding && (
          <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">
            Getting address...
          </p>
        )}
      </div>
    </div>
  )
}
