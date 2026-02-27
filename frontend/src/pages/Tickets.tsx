import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { issuesApi, Issue } from '../api/issues'
import { sitesApi, SiteSummary } from '../api/sites'
import { departmentsApi, DepartmentSummary } from '../api/departments'
import { toast } from 'react-hot-toast'
import { 
  Search, 
  Filter, 
  Plus,
  MoreVertical
} from 'lucide-react'
import { format } from 'date-fns'

const statusConfig = {
  open: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Open' },
  'in-progress': { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'In Progress' },
  resolved: { color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Resolved' },
  closed: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Closed' },
}

const priorityConfig = {
  low: { color: 'bg-gray-500/10 text-gray-500', label: 'Low' },
  medium: { color: 'bg-blue-500/10 text-blue-500', label: 'Medium' },
  high: { color: 'bg-orange-500/10 text-orange-500', label: 'High' },
  critical: { color: 'bg-red-500/10 text-red-500', label: 'Critical' },
}

export default function Tickets() {
  const [tickets, setTickets] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [departments, setDepartments] = useState<DepartmentSummary[]>([])
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    site: 'all',
    department: 'all',
    category: 'all',
  })

  // Use ref to prevent duplicate calls
  const loadingRef = useRef(false)

  const loadData = async () => {
    // Prevent duplicate calls
    if (loadingRef.current) return
    loadingRef.current = true
    
    try {
      const [ticketData, siteData, departmentData] = await Promise.all([
        issuesApi.getAll(),
        sitesApi.getAll(),
        departmentsApi.getAll(),
      ])
      setTickets(ticketData)
      setSites(siteData)
      setDepartments(departmentData)
    } catch (error: any) {
      toast.error('Failed to load tickets')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getSiteId = (site: Issue['site']) => {
    if (!site) return undefined
    return typeof site === 'string' ? site : site._id
  }

  const getSiteName = (site: Issue['site']) => {
    if (!site) return 'Unknown site'
    if (typeof site === 'string') {
      return sites.find((s) => s._id === site)?.name || 'Unknown site'
    }
    return site.name
  }

  const getDepartmentId = (department: Issue['department']) => {
    if (!department) return undefined
    return typeof department === 'string' ? department : department._id
  }

  const getDepartmentName = (department: Issue['department']) => {
    if (!department) return null
    if (typeof department === 'string') {
      return departments.find((d) => d._id === department)?.name || null
    }
    return department.name
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      (ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      ticket._id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filters.status === 'all' || ticket.status === filters.status
    const matchesPriority = filters.priority === 'all' || ticket.priority === filters.priority
    const matchesSite = filters.site === 'all' || getSiteId(ticket.site) === filters.site
    const matchesDepartment = filters.department === 'all' || getDepartmentId(ticket.department) === filters.department

    return matchesSearch && matchesStatus && matchesPriority && matchesSite && matchesDepartment
  })

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
      <div>
        <h1 className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">Tickets</h1>
        <p className="text-text-mutedLight dark:text-text-mutedDark mt-1">View and manage all tickets</p>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors shadow-sm">
          <Filter className="h-5 w-5" />
          <span>Filter</span>
        </button>
        <Link
          to="/tickets/new"
          className="bg-primary dark:bg-primary-light hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <span>New Ticket</span>
        </Link>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-2 flex-wrap gap-2">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        >
          <option value="all">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={filters.site}
          onChange={(e) => setFilters({ ...filters, site: e.target.value })}
          className="px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        >
          <option value="all">All Sites</option>
          {sites.map((site) => (
            <option key={site._id} value={site._id}>
              {site.name}
            </option>
          ))}
        </select>
        <select
          value={filters.department}
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          className="px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        >
          <option value="all">All Departments</option>
          {departments.map((department) => (
            <option key={department._id} value={department._id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl p-12 text-center border border-border-light dark:border-border-dark">
            <p className="text-text-mutedLight dark:text-text-mutedDark">No tickets found</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl p-6 border border-border-light dark:border-border-dark hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm font-mono text-text-mutedLight dark:text-text-mutedDark">#{ticket._id.slice(-8)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig[ticket.status].color}`}>
                      {statusConfig[ticket.status].label}
                    </span>
                    <span className="text-sm text-text-mutedLight dark:text-text-mutedDark">
                      Site: {getSiteName(ticket.site)}
                    </span>
                    {getDepartmentName(ticket.department) && (
                      <span className="text-sm text-text-mutedLight dark:text-text-mutedDark">
                        Department: {getDepartmentName(ticket.department)}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig[ticket.priority].color}`}>
                      {priorityConfig[ticket.priority].label}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark mb-2">{ticket.title}</h3>
                  {ticket.description && (
                    <p className="text-text-mutedLight dark:text-text-mutedDark text-sm mb-3 line-clamp-2">{ticket.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-text-mutedLight dark:text-text-mutedDark">
                    <span>Created: {format(new Date(ticket.createdAt), 'M/d/yyyy')}</span>
                    {ticket.images && ticket.images.length > 0 && (
                      <span>{ticket.images.length} image{ticket.images.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                
                {/* Image Thumbnails */}
                {ticket.images && ticket.images.length > 0 && (
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {ticket.images.slice(0, 3).map((imageUrl, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex-shrink-0"
                      >
                        <img
                          src={imageUrl}
                          alt={`Ticket ${ticket._id} image ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    ))}
                    {ticket.images.length > 3 && (
                      <div className="w-16 h-16 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex items-center justify-center text-xs font-medium text-text-mutedLight dark:text-text-mutedDark">
                        +{ticket.images.length - 3}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                  <Link
                    to={`/tickets/${ticket._id}`}
                    className="bg-primary dark:bg-primary-light hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm shadow-sm"
                  >
                    Open
                  </Link>
                  <button className="p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg">
                    <MoreVertical className="h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

