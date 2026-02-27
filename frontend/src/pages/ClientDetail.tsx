import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { clientsApi, Client, ClientStats } from '../api/clients'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Tag,
  BarChart3,
} from 'lucide-react'
import { format } from 'date-fns'

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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadClient()
      loadStats()
    }
  }, [id])

  const loadClient = async () => {
    try {
      const data = await clientsApi.getById(id!)
      setClient(data)
    } catch (error: any) {
      toast.error('Failed to load client')
      navigate('/clients')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await clientsApi.getStats(id!)
      setStats(data)
    } catch (error: any) {
      console.error('Failed to load stats')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  const StatusIcon = statusConfig[client.status].icon

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center space-x-2 text-dark-text-muted hover:text-dark-text"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Clients</span>
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-primary-600/10 p-4 rounded-lg">
            <Building2 className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-dark-text">{client.companyName}</h1>
            <p className="text-dark-text-muted mt-1">{client.name}</p>
          </div>
        </div>
        <Link
          to={`/clients/${id}/edit`}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Edit className="h-5 w-5" />
          <span>Edit Client</span>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-dark-text">{stats.totalSites}</p>
            <p className="text-sm text-dark-text-muted">Total Sites</p>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-dark-text">{stats.totalUsers}</p>
            <p className="text-sm text-dark-text-muted">Total Users</p>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-dark-text">{stats.totalTickets}</p>
            <p className="text-sm text-dark-text-muted">Total Tickets</p>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Tag className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-dark-text">{stats.openTickets}</p>
            <p className="text-sm text-dark-text-muted">Open Tickets</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-dark-text mb-6">Client Information</h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-dark-text-muted" />
              <div>
                <p className="text-sm text-dark-text-muted">Email</p>
                <p className="text-dark-text">{client.email}</p>
              </div>
            </div>

            {client.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-dark-text-muted" />
                <div>
                  <p className="text-sm text-dark-text-muted">Phone</p>
                  <p className="text-dark-text">{client.phone}</p>
                </div>
              </div>
            )}

            {client.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-dark-text-muted mt-1" />
                <div>
                  <p className="text-sm text-dark-text-muted">Address</p>
                  <p className="text-dark-text">
                    {client.address.street && `${client.address.street}, `}
                    {client.address.city && `${client.address.city}, `}
                    {client.address.state && `${client.address.state} `}
                    {client.address.zipCode && client.address.zipCode}
                    {client.address.country && `, ${client.address.country}`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <div>
                <p className="text-sm text-dark-text-muted">Status</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mt-1 ${statusConfig[client.status].color}`}>
                  <StatusIcon className="h-4 w-4 mr-1" />
                  {statusConfig[client.status].label}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div>
                <p className="text-sm text-dark-text-muted">Subscription Tier</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${tierConfig[client.subscriptionTier].color}`}>
                  {tierConfig[client.subscriptionTier].label}
                </span>
              </div>
            </div>

            {client.createdBy && (
              <div>
                <p className="text-sm text-dark-text-muted">Created By</p>
                <p className="text-dark-text">{client.createdBy.name} ({client.createdBy.email})</p>
              </div>
            )}

            <div>
              <p className="text-sm text-dark-text-muted">Created At</p>
              <p className="text-dark-text">{format(new Date(client.createdAt), 'MMM d, yyyy h:mm a')}</p>
            </div>
          </div>
        </div>

        {/* Sites and Users */}
        <div className="space-y-6">
          {/* Sites */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-dark-text mb-4">Sites ({client.sites?.length || 0})</h2>
            {client.sites && client.sites.length > 0 ? (
              <div className="space-y-2">
                {client.sites.map((site) => (
                  <div key={site._id} className="p-3 bg-dark-surface rounded-lg">
                    <p className="font-medium text-dark-text">{site.name}</p>
                    <p className="text-sm text-dark-text-muted">Code: {site.code}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-text-muted">No sites assigned</p>
            )}
          </div>

          {/* Users */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-dark-text mb-4">Users ({client.users?.length || 0})</h2>
            {client.users && client.users.length > 0 ? (
              <div className="space-y-2">
                {client.users.map((user) => (
                  <div key={user._id} className="p-3 bg-dark-surface rounded-lg">
                    <p className="font-medium text-dark-text">{user.name}</p>
                    <p className="text-sm text-dark-text-muted">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-500/10 text-blue-500 text-xs rounded">
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-text-muted">No users assigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

