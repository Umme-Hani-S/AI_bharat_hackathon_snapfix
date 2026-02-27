import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { issuesApi, Issue } from '../api/issues'
import { clientsApi, Client } from '../api/clients'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-hot-toast'
import { 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  TrendingDown,
  Briefcase,
  Plus,
  Calendar,
  X,
  ChevronRight,
  ArrowLeft
} from 'lucide-react'
import { format, subDays, isSameDay, startOfDay, endOfDay } from 'date-fns'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import DateRangePicker from '../components/DateRangePicker'

export default function Dashboard() {
  const { user } = useAuthStore()
  const isSaaSOwner = user?.role === 'saas-owner'
  
  // Helper function to get default dates (last 7 days)
  const getDefaultDates = () => {
    const end = new Date()
    const start = subDays(end, 6) // Last 7 days (including today)
    return {
      start: format(startOfDay(start), 'yyyy-MM-dd'),
      end: format(endOfDay(end), 'yyyy-MM-dd')
    }
  }
  
  const [issues, setIssues] = useState<Issue[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientStatsList, setClientStatsList] = useState<Array<{ client: Client; stats: any }>>([])
  const [loading, setLoading] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Drill-down state
  const [drillDownLevel, setDrillDownLevel] = useState<'date' | 'site' | 'department'>('date')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState<{ id: string; name: string } | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<{ id: string; name: string } | null>(null)
  
  // Modal state for issue details
  const [showIssuesModal, setShowIssuesModal] = useState(false)
  const [modalIssues, setModalIssues] = useState<Issue[]>([])
  const [modalTitle, setModalTitle] = useState('')
  
  // Initialize with last 7 days by default
  const defaultDates = getDefaultDates()
  const [startDate, setStartDate] = useState<string>(defaultDates.start)
  const [endDate, setEndDate] = useState<string>(defaultDates.end)

  // Use ref to prevent duplicate calls
  const loadingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadIssues = useCallback(async () => {
    // Prevent duplicate calls
    if (loadingRef.current) return
    loadingRef.current = true
    
    try {
      const params: { startDate?: string; endDate?: string } = {}
      if (startDate) {
        params.startDate = startDate
      }
      if (endDate) {
        params.endDate = endDate
      }
      const data = await issuesApi.getAll(params)
      setIssues(data)
    } catch (error: any) {
      toast.error('Failed to load issues')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [startDate, endDate])

  const loadClientsWithStats = useCallback(async () => {
    // Prevent duplicate calls
    if (loadingRef.current) return
    loadingRef.current = true
    
    try {
      const clientsData = await clientsApi.getAll()
      setClients(clientsData)
      
      // Load stats for each client
      const statsPromises = clientsData.map(async (client) => {
        try {
          const stats = await clientsApi.getStats(client._id)
          return { client, stats }
        } catch (error) {
          // If stats fail, return default stats
          return {
            client,
            stats: {
              totalSites: client.sites?.length || 0,
              totalUsers: client.users?.length || 0,
              totalTickets: 0,
              openTickets: 0,
              resolvedTickets: 0,
            }
          }
        }
      })
      
      const statsResults = await Promise.all(statsPromises)
      setClientStatsList(statsResults)
    } catch (error: any) {
      toast.error('Failed to load clients')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Debounce API calls to prevent rapid-fire requests
    timeoutRef.current = setTimeout(() => {
      if (isSaaSOwner) {
        loadClientsWithStats()
      } else {
        loadIssues()
      }
    }, 300) // 300ms debounce
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isSaaSOwner, loadIssues, loadClientsWithStats])

  const handleClearFilters = () => {
    // Reset to default 7 days
    const defaultDates = getDefaultDates()
    setStartDate(defaultDates.start)
    setEndDate(defaultDates.end)
  }

  const handleQuickFilter = (days: number) => {
    const end = new Date()
    const start = subDays(end, days - 1)
    setStartDate(format(startOfDay(start), 'yyyy-MM-dd'))
    setEndDate(format(endOfDay(end), 'yyyy-MM-dd'))
  }

  const stats = {
    open: issues.filter((i) => i.status === 'open').length,
    inProgress: issues.filter((i) => i.status === 'in-progress').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
    atRisk: 3, // Mock data - would come from SLA calculations
  }

  // Chart data - all statuses for legend, but only non-zero for pie slices
  const allStatuses = [
    { name: 'Open', value: stats.open, color: '#3b82f6' },
    { name: 'In Progress', value: stats.inProgress, color: '#eab308' },
    { name: 'Resolved', value: stats.resolved, color: '#22c55e' },
    { name: 'Closed', value: issues.filter((i) => i.status === 'closed').length, color: '#6b7280' },
  ]
  const issuesByStatus = allStatuses.filter(item => item.value > 0) // Only show slices with values > 0

  // Calculate date range for chart (max 31 days / 1 month)
  const getDateRange = () => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      // Limit to 31 days maximum
      const maxDays = Math.min(days, 31)
      return Array.from({ length: maxDays }, (_, index) => {
        const date = new Date(start)
        date.setDate(date.getDate() + index)
        return date
      })
    } else {
      // Default to last 7 days
      return Array.from({ length: 7 }, (_, index) => subDays(new Date(), 6 - index))
    }
  }

  const dateRange = getDateRange()
  
  // Helper function to get site name from issue
  const getSiteName = (issue: Issue): string => {
    if (typeof issue.site === 'string') return issue.site
    return issue.site?.name || 'Unknown Site'
  }
  
  // Helper function to get site ID from issue
  const getSiteId = (issue: Issue): string | null => {
    if (typeof issue.site === 'string') return issue.site
    return issue.site?._id || null
  }
  
  // Helper function to get department name from issue
  const getDepartmentName = (issue: Issue): string => {
    if (typeof issue.department === 'string') return issue.department
    return issue.department?.name || 'No Department'
  }
  
  // Helper function to get department ID from issue
  const getDepartmentId = (issue: Issue): string | null => {
    if (typeof issue.department === 'string') return issue.department
    return issue.department?._id || null
  }
  
  // Filter issues based on drill-down level
  const getFilteredIssues = () => {
    let filtered = issues
    
    if (selectedDate) {
      const date = new Date(selectedDate)
      filtered = filtered.filter((issue) => isSameDay(new Date(issue.createdAt), date))
    }
    
    if (selectedSite) {
      filtered = filtered.filter((issue) => {
        const siteId = getSiteId(issue)
        return siteId === selectedSite.id
      })
    }
    
    if (selectedDepartment) {
      filtered = filtered.filter((issue) => {
        const deptId = getDepartmentId(issue)
        return deptId === selectedDepartment.id
      })
    }
    
    return filtered
  }
  
  // Get chart data based on drill-down level
  const getChartData = () => {
    const filteredIssues = getFilteredIssues()
    
    if (drillDownLevel === 'date') {
      return dateRange.map((day) => {
        const raised = filteredIssues.filter((issue) => isSameDay(new Date(issue.createdAt), day)).length
        const resolved = filteredIssues.filter(
          (issue) => issue.status === 'resolved' && isSameDay(new Date(issue.updatedAt), day)
        ).length

        return {
          date: format(day, startDate && endDate ? 'MMM d' : 'EEE'),
          fullDate: format(day, 'yyyy-MM-dd'),
          raised,
          resolved,
          clickable: true,
        }
      })
    } else if (drillDownLevel === 'site') {
      // Group by site
      const siteMap = new Map<string, { name: string; id: string; count: number }>()
      
      filteredIssues.forEach((issue) => {
        const siteId = getSiteId(issue)
        const siteName = getSiteName(issue)
        
        if (siteId) {
          const existing = siteMap.get(siteId) || { name: siteName, id: siteId, count: 0 }
          existing.count += 1
          siteMap.set(siteId, existing)
        }
      })
      
      return Array.from(siteMap.values())
        .map((site) => ({
          name: site.name,
          id: site.id,
          count: site.count,
          clickable: true,
        }))
        .sort((a, b) => b.count - a.count)
    } else if (drillDownLevel === 'department') {
      // Group by department
      const deptMap = new Map<string, { name: string; id: string; count: number }>()
      
      filteredIssues.forEach((issue) => {
        const deptId = getDepartmentId(issue)
        const deptName = getDepartmentName(issue)
        
        if (deptId) {
          const existing = deptMap.get(deptId) || { name: deptName, id: deptId, count: 0 }
          existing.count += 1
          deptMap.set(deptId, existing)
        } else {
          // Handle issues without department
          const key = 'no-department'
          const existing = deptMap.get(key) || { name: 'No Department', id: key, count: 0 }
          existing.count += 1
          deptMap.set(key, existing)
        }
      })
      
      return Array.from(deptMap.values())
        .map((dept) => ({
          name: dept.name,
          id: dept.id,
          count: dept.count,
          clickable: true, // Clickable to open modal
        }))
        .sort((a, b) => b.count - a.count)
    }
    
    return []
  }
  
  const chartData = getChartData()
  
  // Handle bar click for drill-down
  const handleBarClick = (data: any) => {
    if (!data.clickable) return
    
    if (drillDownLevel === 'date') {
      setSelectedDate(data.fullDate)
      setDrillDownLevel('site')
    } else if (drillDownLevel === 'site') {
      setSelectedSite({ id: data.id, name: data.name })
      setDrillDownLevel('department')
    } else if (drillDownLevel === 'department') {
      // Open modal with issues for this department
      const filteredIssues = getFilteredIssues().filter((issue) => {
        const deptId = getDepartmentId(issue)
        return deptId === data.id || (data.id === 'no-department' && !deptId)
      })
      
      setModalIssues(filteredIssues)
      setModalTitle(`Issues for ${data.name}${selectedSite ? ` - ${selectedSite.name}` : ''}${selectedDate ? ` (${format(new Date(selectedDate), 'MMM d, yyyy')})` : ''}`)
      setShowIssuesModal(true)
    }
  }
  
  // Reset drill-down
  const resetDrillDown = () => {
    setDrillDownLevel('date')
    setSelectedDate(null)
    setSelectedSite(null)
    setSelectedDepartment(null)
  }
  
  // Navigate back in drill-down
  const handleBack = () => {
    if (drillDownLevel === 'department') {
      setDrillDownLevel('site')
      setSelectedDepartment(null)
    } else if (drillDownLevel === 'site') {
      setDrillDownLevel('date')
      setSelectedSite(null)
      setSelectedDate(null)
    }
  }
  
  // Get chart title based on drill-down level
  const getChartTitle = () => {
    if (drillDownLevel === 'date') {
      return 'Issues Raised vs Resolved'
    } else if (drillDownLevel === 'site') {
      return `Sites for ${selectedDate ? format(new Date(selectedDate), 'MMM d, yyyy') : 'Selected Date'}`
    } else if (drillDownLevel === 'department') {
      return `Departments for ${selectedSite?.name || 'Selected Site'}`
    }
    return 'Issues Raised vs Resolved'
  }
  
  // Get breadcrumb path
  const getBreadcrumb = () => {
    const path = []
    if (selectedDate) {
      path.push({ label: format(new Date(selectedDate), 'MMM d, yyyy'), onClick: resetDrillDown })
    }
    if (selectedSite) {
      path.push({ 
        label: selectedSite.name, 
        onClick: drillDownLevel === 'department' ? handleBack : undefined 
      })
    }
    if (selectedDepartment) {
      path.push({ label: selectedDepartment.name })
    }
    return path
  }

  const COLORS = ['#3b82f6', '#eab308', '#22c55e', '#6b7280', '#ef4444']

  const categoryCounts = issues.reduce<Record<string, number>>((acc, issue) => {
    const rawCategory =
      typeof issue.category === 'string' ? issue.category : issue.category?.name
    const key = rawCategory || 'Uncategorized'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const issuesByCategory = Object.entries(categoryCounts).map(([name, value], index) => ({
    name,
    value,
    color: COLORS[index % COLORS.length],
  }))

  const totalIssuesCount = issues.length
  const slaStats = {
    onTrack: stats.resolved,
    atRisk: stats.inProgress,
    breached: stats.open,
  }
  const getSlaWidth = (value: number) =>
    totalIssuesCount > 0 ? `${Math.min(100, (value / totalIssuesCount) * 100)}%` : '0%'

  // Calculate aggregated client stats
  const clientStats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
    pending: clients.filter(c => c.status === 'pending').length,
    totalSites: clientStatsList.reduce((sum, item) => sum + (item.stats.totalSites || 0), 0),
    totalUsers: clientStatsList.reduce((sum, item) => sum + (item.stats.totalUsers || 0), 0),
    totalTickets: clientStatsList.reduce((sum, item) => sum + (item.stats.totalTickets || 0), 0),
    resolvedTickets: clientStatsList.reduce((sum, item) => sum + (item.stats.resolvedTickets || 0), 0),
  }

  const clientsByTier = [
    { name: 'Enterprise', value: clients.filter(c => c.subscriptionTier === 'enterprise').length, color: '#f59e0b' },
    { name: 'Professional', value: clients.filter(c => c.subscriptionTier === 'professional').length, color: '#8b5cf6' },
    { name: 'Basic', value: clients.filter(c => c.subscriptionTier === 'basic').length, color: '#3b82f6' },
    { name: 'Free', value: clients.filter(c => c.subscriptionTier === 'free').length, color: '#6b7280' },
  ]

  const clientsByStatus = [
    { name: 'Active', value: clientStats.active, color: '#22c55e' },
    { name: 'Inactive', value: clientStats.inactive, color: '#6b7280' },
    { name: 'Pending', value: clientStats.pending, color: '#eab308' },
  ]

  const planCounts = clients.reduce<Record<string, number>>((acc, client) => {
    const tier = client.subscriptionTier || 'other'
    acc[tier] = (acc[tier] || 0) + 1
    return acc
  }, {})

  const planBreakdown = Object.entries(planCounts)
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
    }))
    .sort((a, b) => b.value - a.value)

  const clientStatusBreakdown = [
    { label: 'Total', value: clientStats.total },
    { label: 'Trialing', value: clientStats.pending },
    { label: 'Active', value: clientStats.active },
    { label: 'Disabled', value: clientStats.inactive },
  ]

  const milestoneStats = {
    totalChecklists: clientStatsList.reduce((sum, item) => sum + (item.stats.totalChecklists || 0), 0),
    totalIssuesLogged: clientStats.totalTickets,
    activeSites: clientStats.totalSites,
    activeUsers: clientStats.totalUsers,
  }

  const renderStatRow = (label: string, value: number | string) => (
    <div className="flex items-center justify-between text-dark-text">
      <span className="text-sm text-dark-text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )

  // Chart data for issues per client
  const issuesPerClient = clientStatsList
    .map(item => ({
      name: item.client.companyName.length > 15 ? item.client.companyName.substring(0, 15) + '...' : item.client.companyName,
      submitted: item.stats.totalTickets || 0,
      resolved: item.stats.resolvedTickets || 0,
    }))
    .sort((a, b) => b.submitted - a.submitted)
    .slice(0, 10) // Top 10 clients

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // SaaS Owner Dashboard - Clients Overview
  if (isSaaSOwner) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dark-text">Clients Dashboard</h1>
            <p className="text-dark-text-muted mt-1">Overview of all your clients</p>
          </div>
          <Link
            to="/clients/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Client</span>
          </Link>
        </div>

        {/* Snapshot Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Clients</h3>
            <div className="space-y-3">
              {clientStatusBreakdown.map(({ label, value }) => (
                <div key={label}>{renderStatRow(label, value)}</div>
              ))}
            </div>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Plans</h3>
            <div className="space-y-3">
              {planBreakdown.length === 0 ? (
                <p className="text-sm text-dark-text-muted">No plan data yet</p>
              ) : (
                planBreakdown.map(({ label, value }) => (
                  <div key={label}>{renderStatRow(label, value)}</div>
                ))
              )}
            </div>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Milestones</h3>
            <div className="space-y-3">
              {renderStatRow('Total Issues Logged', milestoneStats.totalIssuesLogged)}
              {renderStatRow('Active Sites', milestoneStats.activeSites)}
              {renderStatRow('Active Users', milestoneStats.activeUsers)}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Issues Submitted vs Resolved per Client */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-dark-text mb-4">Issues per Client (Top 10)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={issuesPerClient}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="name" 
                  stroke="#cbd5e1" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#cbd5e1" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937' }}
                  labelStyle={{ color: '#1f2937' }}
                />
                <Legend />
                <Bar dataKey="submitted" fill="#3b82f6" name="Submitted" />
                <Bar dataKey="resolved" fill="#22c55e" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Clients by Status */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-dark-text mb-4">Clients by Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clientsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {clientsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937' }}
                  labelStyle={{ color: '#1f2937' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clients by Tier Chart */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">Clients by Subscription Tier</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={clientsByTier}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {clientsByTier.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937' }}
                labelStyle={{ color: '#1f2937' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Clients Table with Detailed Stats */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-dark-text">Clients Overview</h2>
            <Link
              to="/clients"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-dark-text-muted mx-auto mb-4" />
              <p className="text-dark-text-muted mb-4">No clients yet</p>
              <Link
                to="/clients/new"
                className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Add Your First Client</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text">Client</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-dark-text">Tier</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text">Issues Submitted</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text">Issues Resolved</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text">Sites</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text">Users</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-dark-text">Teams</th>
                  </tr>
                </thead>
                <tbody>
                  {clientStatsList.map(({ client, stats }) => (
                    <tr 
                      key={client._id} 
                      className="border-b border-dark-border hover:bg-dark-surface transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/clients/${client._id}`}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-dark-text">{client.companyName}</div>
                          <div className="text-sm text-dark-text-muted">{client.email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          client.status === 'active' ? 'bg-green-500/10 text-green-500' :
                          client.status === 'inactive' ? 'bg-gray-500/10 text-gray-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          client.subscriptionTier === 'enterprise' ? 'bg-orange-500/10 text-orange-500' :
                          client.subscriptionTier === 'professional' ? 'bg-purple-500/10 text-purple-500' :
                          client.subscriptionTier === 'basic' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {client.subscriptionTier.charAt(0).toUpperCase() + client.subscriptionTier.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-dark-text font-medium">
                        {stats.totalTickets || 0}
                      </td>
                      <td className="py-4 px-4 text-right text-dark-text font-medium">
                        <span className="text-green-500">{stats.resolvedTickets || 0}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-dark-text">
                        {stats.totalSites || client.sites?.length || 0}
                      </td>
                      <td className="py-4 px-4 text-right text-dark-text">
                        {stats.totalUsers || client.users?.length || 0}
                      </td>
                      <td className="py-4 px-4 text-right text-dark-text">
                        {/* TODO: Get teams count from API */}
                        {client.users?.filter(u => u.role === 'head-of-staff' || u.role === 'client').length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Regular Dashboard for other roles
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">Dashboard</h1>
          <p className="text-dark-text-muted mt-1">Welcome back! Here's your overview</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Date Filters */}
          <div className="relative">
            <div 
              className="flex items-center gap-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-2 cursor-pointer hover:border-primary-600 transition-colors"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar className="h-5 w-5 text-text-mutedLight dark:text-text-mutedDark flex-shrink-0" />
              <span className="text-text-mainLight dark:text-text-mainDark text-sm min-w-[100px]">
                {startDate ? format(new Date(startDate), 'dd-MM-yyyy') : 'dd-mm-yyyy'}
              </span>
              <span className="text-text-mutedLight dark:text-text-mutedDark flex-shrink-0">to</span>
              <span className="text-text-mainLight dark:text-text-mainDark text-sm min-w-[100px]">
                {endDate ? format(new Date(endDate), 'dd-MM-yyyy') : 'dd-mm-yyyy'}
              </span>
              {(startDate || endDate) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearFilters()
                  }}
                  className="p-1 hover:bg-bg-light dark:hover:bg-bg-dark rounded transition-colors flex-shrink-0 cursor-pointer"
                  title="Clear filters"
                  type="button"
                >
                  <X className="h-4 w-4 text-text-mutedLight dark:text-text-mutedDark" />
                </button>
              )}
            </div>
            {showDatePicker && (
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClose={() => setShowDatePicker(false)}
                onApply={() => setShowDatePicker(false)}
              />
            )}
          </div>
          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuickFilter(7)}
              type="button"
              className="px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-mainLight dark:text-text-mainDark rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors cursor-pointer"
            >
              7 Days
            </button>
            <button
              onClick={() => handleQuickFilter(30)}
              type="button"
              className="px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-mainLight dark:text-text-mainDark rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors cursor-pointer"
            >
              30 Days
            </button>
            <button
              onClick={() => handleQuickFilter(90)}
              type="button"
              className="px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-mainLight dark:text-text-mainDark rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors cursor-pointer"
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <AlertCircle className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex items-center space-x-1 text-green-500 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>↑ 12%</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-dark-text mb-1">{stats.open}</p>
          <p className="text-sm text-dark-text-muted">Open Tickets</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex items-center space-x-1 text-red-500 text-sm">
              <TrendingDown className="h-4 w-4" />
              <span>↓ 15%</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-dark-text mb-1">2.5h</p>
          <p className="text-sm text-dark-text-muted">Avg Resolution Time</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex items-center space-x-1 text-green-500 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>↑ 8%</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-dark-text mb-1">{stats.resolved}</p>
          <p className="text-sm text-dark-text-muted">Resolved Today</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <AlertCircle className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-dark-text mb-1">{stats.atRisk}</p>
          <p className="text-sm text-dark-text-muted">SLA At Risk</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Issues Raised/Resolved with Drill-down */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {(drillDownLevel !== 'date' || selectedDate) && (
                <button
                  onClick={handleBack}
                  className="p-1 hover:bg-bg-light dark:hover:bg-bg-dark rounded transition-colors"
                  title="Go back"
                >
                  <ArrowLeft className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
                </button>
              )}
              <h2 className="text-xl font-semibold text-text-mainLight dark:text-text-mainDark">
                {getChartTitle()}
              </h2>
            </div>
            {(drillDownLevel !== 'date' || selectedDate) && (
              <button
                onClick={resetDrillDown}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Reset View
              </button>
            )}
          </div>
          
          {/* Breadcrumb */}
          {getBreadcrumb().length > 0 && (
            <div className="flex items-center gap-2 mb-4 text-sm text-text-mutedLight dark:text-text-mutedDark">
              <span 
                className="cursor-pointer hover:text-text-mainLight dark:hover:text-text-mainDark"
                onClick={resetDrillDown}
              >
                All Dates
              </span>
              {getBreadcrumb().map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  {item.onClick ? (
                    <span 
                      className="cursor-pointer hover:text-text-mainLight dark:hover:text-text-mainDark"
                      onClick={item.onClick}
                    >
                      {item.label}
                    </span>
                  ) : (
                    <span className="text-text-mainLight dark:text-text-mainDark font-medium">
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={chartData} 
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  handleBarClick(data.activePayload[0].payload)
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis 
                dataKey={drillDownLevel === 'date' ? 'date' : 'name'} 
                stroke="#6b7280"
                className="dark:stroke-gray-400"
                tick={{ fill: '#6b7280' }}
                style={{ fill: '#6b7280' }}
                angle={drillDownLevel !== 'date' ? -45 : 0}
                textAnchor={drillDownLevel !== 'date' ? 'end' : 'middle'}
                height={drillDownLevel !== 'date' ? 80 : undefined}
              />
              <YAxis 
                stroke="#6b7280"
                className="dark:stroke-gray-400"
                tick={{ fill: '#6b7280' }}
                style={{ fill: '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  color: '#1f2937',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                formatter={(value: number, name: string) => {
                  if (drillDownLevel === 'date') {
                    return [value, name]
                  }
                  return [value, 'Count']
                }}
              />
              {drillDownLevel === 'date' ? (
                <>
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="rect"
                  />
                  <Bar 
                    dataKey="raised" 
                    fill="#3b82f6" 
                    name="Raised"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="resolved" 
                    fill="#22c55e" 
                    name="Resolved"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: 'pointer' }}
                  />
                </>
              ) : (
                <Bar 
                  dataKey={drillDownLevel === 'site' ? 'count' : 'count'} 
                  fill="#3b82f6" 
                  name={drillDownLevel === 'site' ? 'Issues per Site' : 'Issues per Department'}
                  radius={[4, 4, 0, 0]}
                  style={{ cursor: (drillDownLevel === 'site' || drillDownLevel === 'department') ? 'pointer' : 'default' }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
          {drillDownLevel === 'date' && (
            <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-2">
              Click on a date bar to drill down to sites
            </p>
          )}
          {drillDownLevel === 'site' && (
            <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-2">
              Click on a site bar to drill down to departments
            </p>
          )}
          {drillDownLevel === 'department' && (
            <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-2">
              Click on a department bar to view issue details
            </p>
          )}
        </div>

        {/* Pie Chart - Issues by Status */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">Issues by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={issuesByStatus}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent, value }) => 
                  value > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                innerRadius={0}
              >
                {issuesByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937' }}
                labelStyle={{ color: '#1f2937' }}
                formatter={(value: number, name: string) => [`${value} issues`, name]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                payload={allStatuses.map((item) => {
                  const total = allStatuses.reduce((sum, d) => sum + d.value, 0)
                  const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0'
                  return {
                    value: `${item.name} ${percent}%`,
                    type: 'circle',
                    id: item.name,
                    color: item.color,
                  }
                })}
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row - Category Chart and Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Issues by Category */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">Issues by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={issuesByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {issuesByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937' }}
                labelStyle={{ color: '#1f2937' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* SLA Performance */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">SLA Performance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-dark-text">On Track</span>
                <span className="text-sm font-medium text-dark-text">
                  {slaStats.onTrack} {slaStats.onTrack === 1 ? 'ticket' : 'tickets'}
                </span>
              </div>
              <div className="w-full bg-dark-surface rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: getSlaWidth(slaStats.onTrack) }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-dark-text">At Risk</span>
                <span className="text-sm font-medium text-dark-text">
                  {slaStats.atRisk} {slaStats.atRisk === 1 ? 'ticket' : 'tickets'}
                </span>
              </div>
              <div className="w-full bg-dark-surface rounded-full h-3">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all"
                  style={{ width: getSlaWidth(slaStats.atRisk) }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-dark-text">Breached</span>
                <span className="text-sm font-medium text-dark-text">
                  {slaStats.breached} {slaStats.breached === 1 ? 'ticket' : 'tickets'}
                </span>
              </div>
              <div className="w-full bg-dark-surface rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all"
                  style={{ width: getSlaWidth(slaStats.breached) }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Issues Modal */}
      {showIssuesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
              <h2 className="text-2xl font-semibold text-text-mainLight dark:text-text-mainDark">
                {modalTitle}
              </h2>
              <button
                onClick={() => setShowIssuesModal(false)}
                className="p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded transition-colors"
              >
                <X className="h-6 w-6 text-text-mainLight dark:text-text-mainDark" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalIssues.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-text-mutedLight dark:text-text-mutedDark mx-auto mb-4" />
                  <p className="text-text-mainLight dark:text-text-mainDark">No issues found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modalIssues.map((issue) => {
                    const statusColors = {
                      open: 'bg-blue-500/10 text-blue-500',
                      'in-progress': 'bg-yellow-500/10 text-yellow-500',
                      resolved: 'bg-green-500/10 text-green-500',
                      closed: 'bg-gray-500/10 text-gray-500',
                    }
                    
                    const priorityColors = {
                      low: 'bg-gray-500/10 text-gray-500',
                      medium: 'bg-blue-500/10 text-blue-500',
                      high: 'bg-orange-500/10 text-orange-500',
                      critical: 'bg-red-500/10 text-red-500',
                    }

                    const siteName = getSiteName(issue)
                    const categoryName = typeof issue.category === 'string' 
                      ? issue.category 
                      : issue.category?.name || 'Uncategorized'
                    
                    return (
                      <Link
                        key={issue._id}
                        to={`/tickets/${issue._id}`}
                        className="block bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-4 hover:border-primary-600 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-text-mainLight dark:text-text-mainDark text-sm line-clamp-2 flex-1">
                            {issue.title || issue.description?.substring(0, 50) || 'Untitled Issue'}
                          </h3>
                        </div>
                        
                        <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mb-3 line-clamp-2">
                          {issue.description || 'No description'}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[issue.status] || statusColors.open}`}>
                            {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[issue.priority] || priorityColors.medium}`}>
                            {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-text-mutedLight dark:text-text-mutedDark">
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            <span className="truncate">{siteName}</span>
                          </div>
                          {categoryName && (
                            <div className="flex items-center gap-1">
                              <span className="truncate">Category: {categoryName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(issue.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border-light dark:border-border-dark flex items-center justify-between">
              <p className="text-sm text-text-mutedLight dark:text-text-mutedDark">
                {modalIssues.length} {modalIssues.length === 1 ? 'issue' : 'issues'} found
              </p>
              <button
                onClick={() => setShowIssuesModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
