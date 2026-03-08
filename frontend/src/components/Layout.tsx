import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  LayoutDashboard, 
  FileText, 
  LogOut, 
  X,
  Building2,
  Users,
  Tag,
  Settings,
  Sun,
  Moon,
  Briefcase,
  Download,
  ChevronDown,
  MoreVertical,
  FileCode
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Initialize darkMode from localStorage or default to false (light mode)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const isSaaSOwner = user?.role === 'saas-owner'
  const isFieldStaff = user?.role === 'field-staff'

  // Main navigation items shown directly in top bar
  const mainNavigation = isSaaSOwner
    ? [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }]
    : [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Tickets', href: '/tickets', icon: FileText },
        { name: 'Sites', href: '/sites', icon: Building2 },
        { name: 'Teams', href: '/teams', icon: Users },
      ]

  // Items to show in "More" dropdown
  const moreNavigation = isSaaSOwner
    ? [
        { name: 'Clients', href: '/clients', icon: Briefcase },
        { name: 'Logs', href: '/logs', icon: FileCode },
      ]
    : [
        { name: 'Locations', href: '/locations', icon: Building2 },
        ...(isFieldStaff ? [] : [{ name: 'Users', href: '/users', icon: Users }]),
        { name: 'Categories', href: '/categories', icon: Tag },
        { name: 'Logs', href: '/logs', icon: FileCode },
        { name: 'Settings', href: '/settings', icon: Settings },
      ]

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-primary dark:bg-primary border-b border-primary-dark shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-xl font-bold text-white">Snapfix</span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 flex-1 justify-center">
            {mainNavigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              )
            })}
            {/* More Dropdown */}
            <div className="relative group">
              <button className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                moreNavigation.some(item => location.pathname === item.href)
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}>
                <MoreVertical className="h-4 w-4" />
                <span className="text-sm">More</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-primary border border-primary-dark rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-2">
                  {moreNavigation.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-white/20 text-white font-medium'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </nav>

          {/* Right Side Icons */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/reports')}
              className="p-2 hover:bg-primary-dark rounded-lg text-white transition-colors cursor-pointer"
              title="Download Reports"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-primary-dark rounded-lg text-white transition-colors cursor-pointer"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <div className="relative group">
              <div className="flex items-center space-x-2 px-2 py-1 rounded-lg hover:bg-primary-dark transition-colors cursor-pointer">
                <div className="bg-white/20 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  {getInitials(user?.name || 'JD')}
                </div>
              </div>
              <div className="absolute right-0 top-full mt-1 w-48 bg-primary border border-primary-dark rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-surface-dark">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-text-mainLight dark:text-text-mainDark">Snapfix</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-text-mainLight dark:text-text-mainDark cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {[...mainNavigation, ...moreNavigation].map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary/10 text-primary dark:text-primary-light font-medium'
                        : 'text-text-mutedLight dark:text-text-mutedDark hover:bg-surface-light dark:hover:bg-surface-dark hover:text-text-mainLight dark:hover:text-text-mainDark'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}

