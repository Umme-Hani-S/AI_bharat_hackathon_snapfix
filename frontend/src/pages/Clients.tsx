import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clientsApi, Client } from '../api/clients'
import { toast } from 'react-hot-toast'
import { 
  Building2, 
  Search, 
  Plus, 
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'

const statusConfig = {
  active: { color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Active', icon: CheckCircle },
  inactive: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Inactive', icon: XCircle },
  pending: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Pending', icon: Clock },
}

const tierConfig = {
  free: { color: 'bg-gray-500/10 text-gray-500', label: 'Free' },
  basic: { color: 'bg-blue-500/10 text-blue-500', label: 'Basic' },
  professional: { color: 'bg-purple-500/10 text-purple-500', label: 'Professional' },
  enterprise: { color: 'bg-orange-500/10 text-orange-500', label: 'Enterprise' },
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadClients()
  }, [statusFilter])

  const loadClients = async () => {
    try {
      const params: any = {}
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (searchQuery) {
        params.search = searchQuery
      }
      const data = await clientsApi.getAll(params)
      setClients(data)
    } catch (error: any) {
      toast.error('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) {
      return
    }

    try {
      await clientsApi.delete(id)
      toast.success('Client deleted successfully')
      loadClients()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete client')
    }
  }

  const filteredClients = clients.filter((client) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.companyName.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">Clients</h1>
          <p className="text-dark-text-muted mt-1">Manage your agency clients</p>
        </div>
        <Link
          to="/clients/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Client</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-text-muted" />
          <input
            type="text"
            placeholder="Search clients by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-card border border-dark-border rounded-lg text-dark-text placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-primary-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => {
          const StatusIcon = statusConfig[client.status].icon
          return (
            <div
              key={client._id}
              className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-primary-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-600/10 p-3 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text">{client.companyName}</h3>
                    <p className="text-sm text-dark-text-muted">{client.name}</p>
                  </div>
                </div>
                <div className="relative group">
                  <button className="p-2 hover:bg-dark-surface rounded-lg">
                    <MoreVertical className="h-5 w-5 text-dark-text-muted" />
                  </button>
                  <div className="absolute right-0 top-8 hidden group-hover:block bg-dark-surface border border-dark-border rounded-lg shadow-lg z-10 min-w-[120px]">
                    <Link
                      to={`/clients/${client._id}`}
                      className="w-full text-left px-4 py-2 text-sm text-dark-text hover:bg-dark-card flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </Link>
                    <Link
                      to={`/clients/${client._id}/edit`}
                      className="w-full text-left px-4 py-2 text-sm text-dark-text hover:bg-dark-card flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Link>
                    <button
                      onClick={() => handleDelete(client._id, client.companyName)}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-dark-card flex items-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2 text-sm text-dark-text-muted">
                  <Mail className="h-4 w-4" />
                  <span>{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center space-x-2 text-sm text-dark-text-muted">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center space-x-2 text-sm text-dark-text-muted">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {client.address.city}, {client.address.state}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-dark-border">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig[client.status].color}`}>
                    <StatusIcon className="h-3 w-3 inline mr-1" />
                    {statusConfig[client.status].label}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierConfig[client.subscriptionTier].color}`}>
                    {tierConfig[client.subscriptionTier].label}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-border grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-dark-text-muted">Sites</p>
                  <p className="text-lg font-semibold text-dark-text">{client.sites?.length || 0}</p>
                </div>
                <div>
                  <p className="text-dark-text-muted">Users</p>
                  <p className="text-lg font-semibold text-dark-text">{client.users?.length || 0}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
          <Building2 className="h-12 w-12 text-dark-text-muted mx-auto mb-4" />
          <p className="text-dark-text-muted mb-4">No clients found</p>
          <Link
            to="/clients/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Your First Client</span>
          </Link>
        </div>
      )}
    </div>
  )
}

