import { useEffect, useState } from 'react'
import { Users, Search, Plus, MoreVertical, UserPlus, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { departmentsApi, DepartmentSummary } from '../api/departments'
import { useAuthStore } from '../store/authStore'

export default function Teams() {
  const { user } = useAuthStore()
  const isFieldStaff = user?.role === 'field-staff'
  const [departments, setDepartments] = useState<DepartmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    isCompliance: false,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const data = await departmentsApi.getAll()
      setDepartments(data)
    } catch (error: any) {
      toast.error('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Team name is required')
      return
    }

    setSubmitting(true)
    try {
      await departmentsApi.create({
        name: formData.name.trim(),
        isCompliance: formData.isCompliance,
      })
      toast.success('Team created successfully')
      setIsModalOpen(false)
      setFormData({ name: '', isCompliance: false })
      loadTeams()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create team')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTeams = departments.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">Teams</h1>
          <p className="text-text-mutedLight dark:text-text-mutedDark mt-1">Manage teams and departments</p>
        </div>
        {!isFieldStaff && (
          <button
            className="bg-primary dark:bg-primary-light hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-5 w-5" />
            <span>New Team</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
        <input
          type="text"
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {/* Teams List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div
            key={team._id}
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6 hover:border-primary transition-colors shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-primary dark:text-primary-light" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark">{team.name}</h3>
                  <p className="text-sm text-text-mutedLight dark:text-text-mutedDark">
                    {team.isCompliance ? 'Compliance' : 'Operations'}
                  </p>
                </div>
              </div>
              {!isFieldStaff && (
                <button className="p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg">
                  <MoreVertical className="h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border-light dark:border-border-dark">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-xs text-text-mutedLight dark:text-text-mutedDark">Members</p>
                  <p className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark">{team.memberCount}</p>
                </div>
                <div>
                  <p className="text-xs text-text-mutedLight dark:text-text-mutedDark">Active Tickets</p>
                  <p className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark">{team.activeTickets}</p>
                </div>
              </div>
              <button className="p-2 bg-primary/10 text-primary dark:text-primary-light rounded-lg hover:bg-primary/20 transition-colors">
                <UserPlus className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-12 text-center shadow-sm">
          <p className="text-text-mutedLight dark:text-text-mutedDark">No teams found</p>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!submitting) {
                setIsModalOpen(false)
                setFormData({ name: '', isCompliance: false })
              }
            }}
          ></div>
          <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl w-full max-w-lg p-6 space-y-6 shadow-lg">
            <button
              className="absolute top-4 right-4 p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg"
              onClick={() => {
                if (!submitting) {
                  setIsModalOpen(false)
                  setFormData({ name: '', isCompliance: false })
                }
              }}
              aria-label="Close add team form"
            >
              <X className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
            </button>

            <div>
              <h2 className="text-2xl font-semibold text-text-mainLight dark:text-text-mainDark">Add Team</h2>
              <p className="text-text-mutedLight dark:text-text-mutedDark">
                Create a new team/department to assign tickets and members.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleCreateTeam}>
              <div>
                <label className="block text-sm text-text-mutedLight dark:text-text-mutedDark mb-2">Team Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div className="flex items-center space-x-3">
                <input
                  id="teamCompliance"
                  type="checkbox"
                  className="h-5 w-5 rounded border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-primary focus:ring-primary"
                  checked={formData.isCompliance}
                  onChange={(e) => setFormData({ ...formData, isCompliance: e.target.checked })}
                  disabled={submitting}
                />
                <label htmlFor="teamCompliance" className="text-sm text-text-mainLight dark:text-text-mainDark">
                  Compliance team
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-border-light dark:border-border-dark text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark shadow-sm"
                  onClick={() => {
                    if (!submitting) {
                      setIsModalOpen(false)
                      setFormData({ name: '', isCompliance: false })
                    }
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary dark:bg-primary-light hover:bg-primary-dark text-white transition-colors disabled:opacity-60 shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

