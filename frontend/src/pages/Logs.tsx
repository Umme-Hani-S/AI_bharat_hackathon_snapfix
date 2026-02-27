import { useEffect, useState } from 'react'
import { logsApi, Log } from '../api/logs'
import { toast } from 'react-hot-toast'
import { Search, Filter, FileText, Calendar } from 'lucide-react'
import { format } from 'date-fns'

const typeConfig = {
  'issue-creation-organization': { 
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', 
    label: 'Web Issue (React)' 
  },
  'issue-creation-public': { 
    color: 'bg-green-500/10 text-green-500 border-green-500/20', 
    label: 'Public Issue (React)' 
  },
  'issue-creation-mobile': { 
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', 
    label: 'Mobile Issue (API)' 
  },
  'error': { 
    color: 'bg-red-500/10 text-red-500 border-red-500/20', 
    label: 'Error' 
  },
  'warning': { 
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', 
    label: 'Warning' 
  },
  'info': { 
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', 
    label: 'Info' 
  },
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    type: 'all',
    level: 'all',
  })

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const logData = await logsApi.getAll()
      setLogs(logData)
    } catch (error: any) {
      toast.error('Failed to load logs')
      console.error('Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.functionName && log.functionName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (typeof log.issueId === 'object' && log.issueId?.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = filters.type === 'all' || log.type === filters.type
    const matchesLevel = filters.level === 'all' || log.level === filters.level

    return matchesSearch && matchesType && matchesLevel
  })

  const getUserName = (userId: Log['userId']) => {
    if (!userId) return 'N/A'
    if (typeof userId === 'string') return userId
    return userId.name || userId.email || 'N/A'
  }

  const getIssueTitle = (issueId: Log['issueId']) => {
    if (!issueId) return 'N/A'
    if (typeof issueId === 'string') return issueId
    return issueId.title || 'N/A'
  }

  const getClientName = (clientId: Log['clientId']) => {
    if (!clientId) return 'N/A'
    if (typeof clientId === 'string') return clientId
    return clientId.name || 'N/A'
  }

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
        <h1 className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">Logs</h1>
        <p className="text-text-mutedLight dark:text-text-mutedDark mt-1">View all application logs with file names and line numbers</p>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
          <input
            type="text"
            placeholder="Search logs by message, file name, function name, or issue title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors shadow-sm">
          <Filter className="h-5 w-5" />
          <span>Filter</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-2 flex-wrap gap-2">
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        >
          <option value="all">All Types</option>
          <option value="issue-creation-organization">Web Issues (React)</option>
          <option value="issue-creation-mobile">Mobile Issues (API)</option>
          <option value="issue-creation-public">Public Issues (React)</option>
          <option value="error">Errors</option>
          <option value="warning">Warnings</option>
          <option value="info">Info</option>
        </select>
        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          className="px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        >
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
      </div>

      {/* Logs List */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl p-12 text-center border border-border-light dark:border-border-dark">
            <FileText className="h-12 w-12 text-text-mutedLight dark:text-text-mutedDark mx-auto mb-4" />
            <p className="text-text-mutedLight dark:text-text-mutedDark">No logs found</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log._id}
              className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl p-6 border border-border-light dark:border-border-dark hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      log.type && typeConfig[log.type]?.color 
                        ? typeConfig[log.type].color 
                        : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                    }`}>
                      {log.type && typeConfig[log.type]?.label ? typeConfig[log.type].label : (log.type || 'Unknown')}
                    </span>
                    {log.level && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.level === 'error' ? 'bg-red-500/10 text-red-500' :
                        log.level === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                        log.level === 'info' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm font-mono text-text-mutedLight dark:text-text-mutedDark">
                      {log.fileName}:{log.lineNumber}
                    </span>
                    {log.functionName && log.functionName !== 'unknown' && (
                      <span className="text-sm text-text-mutedLight dark:text-text-mutedDark">
                        {log.functionName}()
                      </span>
                    )}
                  </div>
                  
                  <p className="text-text-mainLight dark:text-text-mainDark mb-3">{log.message}</p>
                  
                  {/* Error Stack */}
                  {log.errorStack && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-xs font-medium text-red-500 mb-1">Error Stack:</p>
                      <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap break-words">
                        {log.errorStack}
                      </pre>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-mutedLight dark:text-text-mutedDark">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}</span>
                    </div>
                    <div>
                      <span className="font-medium">Issue:</span> {getIssueTitle(log.issueId)}
                    </div>
                    <div>
                      <span className="font-medium">User:</span> {getUserName(log.userId)}
                    </div>
                    <div>
                      <span className="font-medium">Client:</span> {getClientName(log.clientId)}
                    </div>
                    {log.errorName && (
                      <div>
                        <span className="font-medium">Error Type:</span> <span className="text-red-500">{log.errorName}</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-3 p-3 bg-bg-light dark:bg-bg-dark rounded-lg border border-border-light dark:border-border-dark">
                      <p className="text-xs font-medium text-text-mutedLight dark:text-text-mutedDark mb-2">Metadata:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium text-text-mutedLight dark:text-text-mutedDark">{key}:</span>{' '}
                            <span className="text-text-mainLight dark:text-text-mainDark">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="bg-surface-light dark:bg-surface-dark shadow-sm rounded-xl p-4 border border-border-light dark:border-border-dark">
        <p className="text-sm text-text-mutedLight dark:text-text-mutedDark">
          Showing {filteredLogs.length} of {logs.length} logs
        </p>
      </div>
    </div>
  )
}

