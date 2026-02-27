import { create } from 'zustand'
import api from '../api/client'

// Global ref to prevent duplicate auth calls
let authInitializing = false
let authCheckInProgress = false

interface User {
  id: string
  name: string
  email: string
  role?: string
  clientId?: string
  accountType?: 'client' | 'user'
  isClientAdmin?: boolean
  isSaasOwner?: boolean
  isSuperAdmin?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  initialize: () => Promise<void>
  checkAuth: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: (user, token) => {
    // Store in localStorage for persistence
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('authTimestamp', Date.now().toString())
    set({ user, token, isAuthenticated: true, isLoading: false })
  },
  logout: () => {
    // Clear all auth data
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('authTimestamp')
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },
  initialize: async () => {
    // Prevent duplicate initialization
    if (authInitializing) return
    authInitializing = true
    
    set({ isLoading: true })
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    const authTimestamp = localStorage.getItem('authTimestamp')

    if (!token || !userStr) {
      set({ isLoading: false })
      authInitializing = false
      return
    }

    // Check if session is too old (optional: 30 days max)
    if (authTimestamp) {
      const daysSinceLogin = (Date.now() - parseInt(authTimestamp)) / (1000 * 60 * 60 * 24)
      if (daysSinceLogin > 30) {
        // Session expired
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('authTimestamp')
        set({ user: null, token: null, isAuthenticated: false, isLoading: false })
        authInitializing = false
        return
      }
    }

    try {
      const user = JSON.parse(userStr)
      // Set initial state, then validate token in background
      set({ user, token, isAuthenticated: true, isLoading: false })
      
      // Validate token with server (non-blocking)
      get().checkAuth().catch(() => {
        // If validation fails, clear auth
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('authTimestamp')
        set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      }).finally(() => {
        authInitializing = false
      })
    } catch {
      // Invalid user data, clear storage
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('authTimestamp')
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      authInitializing = false
    }
  },
  checkAuth: async () => {
    // Prevent duplicate auth checks
    if (authCheckInProgress) {
      // Wait for existing check to complete
      return new Promise<boolean>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!authCheckInProgress) {
            clearInterval(checkInterval)
            resolve(true)
          }
        }, 100)
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval)
          resolve(false)
        }, 5000)
      })
    }
    
    authCheckInProgress = true
    const token = localStorage.getItem('token')
    if (!token) {
      authCheckInProgress = false
      return false
    }

    try {
      // Use static import - safe since this is called asynchronously
      const { data: userData } = await api.get('/auth/me')

      if (userData && userData.id) {
        const currentUser = get().user
        if (!currentUser || userData.id !== currentUser.id) {
          get().setAuth(userData, token)
        }
        authCheckInProgress = false
        return true
      }

      authCheckInProgress = false
      return false
    } catch (error) {
      // Token invalid or expired
      authCheckInProgress = false
      return false
    }
  },
}))

