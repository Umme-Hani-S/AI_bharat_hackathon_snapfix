import { useEffect, useState } from 'react'
import { Search, Plus, Mail, X, Edit2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { departmentsApi, DepartmentSummary } from '../api/departments'
import { sitesApi, SiteSummary } from '../api/sites'
import { usersApi, CreatedUserResponse } from '../api/users'
import { useAuthStore } from '../store/authStore'

interface UserData {
  _id: string
  name: string
  email: string
  team?: string
  isSuperAdmin: boolean
  isClientAdmin?: boolean
  activeTickets: number
  avatar?: string
  roles?: string[]
  siteIds?: string[]
  departmentIds?: string[]
}

const roleOptions = [
  { value: 'head-of-staff', label: 'Head of Staff' },
  { value: 'field-staff', label: 'Field Staff' },
  { value: 'tenants', label: 'Tenants' },
  { value: 'vendors', label: 'Vendors' },
]

type SectionKey = 'clients' | 'super-admins' | 'head-staff' | 'field-staff' | 'tenants' | 'vendors' | 'all-users'

type SectionConfig = {
  id: SectionKey
  label: string
  subtitle?: string
  count: number
  items: UserData[]
}

export default function Users() {
  const { user } = useAuthStore()
  const isFieldStaff = user?.role === 'field-staff'
  const isClientAdmin = user?.isClientAdmin === true
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SectionKey>('all-users')
  const [departments, setDepartments] = useState<DepartmentSummary[]>([])
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    isSuperAdmin: false,
  })
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([])
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([])

const mapUserResponse = (user: CreatedUserResponse): UserData => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isSuperAdmin: user.isSuperAdmin,
  isClientAdmin: Boolean(user.isClientAdmin),
  activeTickets: user.activeTickets ?? 0,
  roles: user.roles || [],
  siteIds: user.siteIds || [],
  departmentIds: user.departmentIds || [],
})

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const [deptData, siteData, userData] = await Promise.all([
        departmentsApi.getAll(),
        sitesApi.getAll(),
        usersApi.getAll(),
      ])
      setDepartments(deptData)
      setSites(siteData)
      setUsers(userData.map((user) => mapUserResponse(user)))
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = (
    role: 'field-staff' | 'head-of-staff' | 'superadmin' | 'client-admin' | 'tenants' | 'vendors' | 'unassigned'
  ) => {
    const roles = {
      'field-staff': { label: 'Field Staff', color: 'bg-blue-500/10 text-blue-500' },
      'head-of-staff': { label: 'Head of Staff', color: 'bg-green-500/10 text-green-500' },
      'tenants': { label: 'Tenants', color: 'bg-cyan-500/10 text-cyan-500' },
      'vendors': { label: 'Vendors', color: 'bg-orange-500/10 text-orange-500' },
      'superadmin': { label: 'Admin', color: 'bg-purple-500/10 text-purple-500' },
      'client-admin': { label: 'Client Admin', color: 'bg-amber-500/10 text-amber-400' },
      'unassigned': { label: 'Unassigned', color: 'bg-gray-500/10 text-gray-500' },
    }
    return roles[role] || roles['unassigned']
  }

  const getUserPrimaryRole = (
    user: UserData
  ): 'field-staff' | 'head-of-staff' | 'superadmin' | 'client-admin' | 'tenants' | 'vendors' | 'unassigned' => {
    if (user.isSuperAdmin) {
      return 'superadmin'
    }
    if (user.isClientAdmin) {
      return 'client-admin'
    }
    if (user.roles && user.roles.length > 0) {
      // Priority: head-of-staff > field-staff > vendors > tenants
      if (user.roles.includes('head-of-staff')) return 'head-of-staff'
      if (user.roles.includes('field-staff')) return 'field-staff'
      if (user.roles.includes('vendors')) return 'vendors'
      if (user.roles.includes('tenants')) return 'tenants'
    }
    return 'unassigned'
  }

  const normalizedSearch = searchQuery.trim().toLowerCase()

  const filteredUsers = users.filter((user) => {
    if (!normalizedSearch) return true
    return (
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch)
    )
  })

  const userHasRole = (user: UserData, role: 'field-staff' | 'head-of-staff' | 'tenants' | 'vendors') => {
    if (!user.roles || user.roles.length === 0) return false
    return user.roles.includes(role)
  }

  const clientAdminUsers = filteredUsers.filter((user) => Boolean(user.isClientAdmin))
  const superAdminUsers = filteredUsers.filter((user) => user.isSuperAdmin)
  const headStaffUsers = filteredUsers.filter((user) => userHasRole(user, 'head-of-staff'))
  const fieldStaffUsers = filteredUsers.filter((user) => userHasRole(user, 'field-staff'))
  const tenantsUsers = filteredUsers.filter((user) => userHasRole(user, 'tenants'))
  const vendorsUsers = filteredUsers.filter((user) => userHasRole(user, 'vendors'))

  const handleExport = () => {
    toast.success('Export coming soon')
  }

  const renderUserRow = (user: UserData) => {
    const roleBadge = getRoleBadge(getUserPrimaryRole(user))
    return (
      <div
        key={user._id}
        className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
      >
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 text-primary dark:text-primary-light rounded-full w-10 h-10 flex items-center justify-center font-semibold">
            {getInitials(user.name)}
          </div>
          <div>
            <p className="font-semibold text-text-mainLight dark:text-text-mainDark">{user.name}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-mutedLight dark:text-text-mutedDark">
              <span className="flex items-center space-x-1">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
              {user.roles && user.roles.length > 0 && (
                <span className="text-xs">
                  Roles: {user.roles.map((r) => getRoleBadge(r as any).label).join(', ')}
                </span>
              )}
              {user.siteIds && user.siteIds.length > 0 && (
                <span className="text-xs">
                  Sites: {user.siteIds.length}
                </span>
              )}
              {user.departmentIds && user.departmentIds.length > 0 && (
                <span className="text-xs">
                  Departments: {user.departmentIds.length}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs text-text-mutedLight dark:text-text-mutedDark">Active Tickets</p>
            <p className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark">{user.activeTickets}</p>
          </div>
          {!isFieldStaff && (
            <button
              className="p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg"
              onClick={() => {
                setEditUserId(user._id)
                setFormData({
                  name: user.name,
                  email: user.email,
                  password: '',
                  isSuperAdmin: user.isSuperAdmin,
                })
                setSelectedRoles(user.roles || [])
                setSelectedSiteIds(user.siteIds || [])
                setSelectedDepartmentIds(user.departmentIds || [])
                setIsModalOpen(true)
              }}
              aria-label={`Edit ${user.name}`}
            >
              <Edit2 className="h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
            </button>
          )}
        </div>
      </div>
    )
  }

  const sectionConfigs: SectionConfig[] = [
    {
      id: 'clients',
      label: 'Client Admins',
      subtitle: 'Client administrators',
      count: clientAdminUsers.length,
      items: clientAdminUsers,
    },
    {
      id: 'super-admins',
      label: 'Super Admins',
      subtitle: 'Full platform access',
      count: superAdminUsers.length,
      items: superAdminUsers,
    },
    {
      id: 'head-staff',
      label: 'Head of Staff',
      subtitle: 'Department leads',
      count: headStaffUsers.length,
      items: headStaffUsers,
    },
    {
      id: 'field-staff',
      label: 'Field Staff',
      subtitle: 'Frontline execution',
      count: fieldStaffUsers.length,
      items: fieldStaffUsers,
    },
    {
      id: 'tenants',
      label: 'Tenants',
      subtitle: 'Property tenants and residents',
      count: tenantsUsers.length,
      items: tenantsUsers,
    },
    {
      id: 'vendors',
      label: 'Vendors',
      subtitle: 'External service providers',
      count: vendorsUsers.length,
      items: vendorsUsers,
    },
    {
      id: 'all-users',
      label: 'All Users',
      subtitle: 'Complete list',
      count: filteredUsers.length,
      items: filteredUsers,
    },
  ]

  const activeSectionConfig =
    sectionConfigs.find((section) => section.id === activeSection) ||
    sectionConfigs[sectionConfigs.length - 1]

  const sectionTypeLabel: Record<SectionKey, string> = {
    clients: 'Client Admins',
    'super-admins': 'Super Admins',
    'head-staff': 'Head of Staff',
    'field-staff': 'Field Staff',
    tenants: 'Tenants',
    vendors: 'Vendors',
    'all-users': 'Users',
  }

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">Manage Users</h1>
          <p className="text-text-mutedLight dark:text-text-mutedDark mt-1">
            Browse clients and team members across roles
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark flex items-center space-x-2 shadow-sm"
            onClick={handleExport}
          >
            <span>Export</span>
          </button>
          {isClientAdmin && (
          <button
            className="bg-primary dark:bg-primary-light hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
            onClick={() => {
              setEditUserId(null)
              setFormData({
                name: '',
                email: '',
                password: '',
                isSuperAdmin: false,
              })
              setSelectedRoles([])
              setSelectedSiteIds([])
              setSelectedDepartmentIds([])
              setIsModalOpen(true)
            }}
          >
          <Plus className="h-5 w-5" />
          <span>Add User</span>
        </button>
        )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-mutedLight dark:text-text-mutedDark" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark placeholder-text-mutedLight dark:placeholder-text-mutedDark focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark">Sections</h2>
            <span className="text-xs text-text-mutedLight dark:text-text-mutedDark uppercase">Select</span>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {sectionConfigs.map((section) => (
              <button
                key={section.id}
                className={`w-full text-left px-4 py-3 border-b border-border-light dark:border-border-dark text-text-mainLight dark:text-text-mainDark flex items-center justify-between hover:bg-bg-light dark:hover:bg-bg-dark ${
                  activeSection === section.id ? 'bg-primary/10 text-primary dark:text-primary-light' : ''
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="font-medium">{section.label}</span>
                <span className="text-sm text-text-mutedLight dark:text-text-mutedDark">{section.count}</span>
              </button>
            ))}
          </div>
                    </div>

        <div className="lg:col-span-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border-light dark:border-border-dark">
                    <div>
              <p className="text-sm uppercase text-text-mutedLight dark:text-text-mutedDark">
                {sectionTypeLabel[activeSection]}
              </p>
              <h2 className="text-2xl font-semibold text-text-mainLight dark:text-text-mainDark">{activeSectionConfig.label}</h2>
              {activeSectionConfig.subtitle && (
                <p className="text-sm text-text-mutedLight dark:text-text-mutedDark">{activeSectionConfig.subtitle}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase text-text-mutedLight dark:text-text-mutedDark">Tags</span>
              <button className="px-3 py-1 border border-border-light dark:border-border-dark rounded-lg text-sm text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark shadow-sm">
                Manage
              </button>
                      </div>
                        </div>
          <div className="max-h-[520px] overflow-y-auto">
            {activeSectionConfig.items.length === 0 ? (
              <div className="p-6 text-text-mutedLight dark:text-text-mutedDark">No records found</div>
            ) : (
              activeSectionConfig.items.map((user) => renderUserRow(user))
                        )}
                      </div>
                    </div>
                  </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl w-full max-w-3xl my-8 relative shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-6 py-4 rounded-t-xl z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-text-mainLight dark:text-text-mainDark">
                    {editUserId ? 'Edit User' : 'Add User'}
                  </h2>
                  <p className="text-sm text-text-mutedLight dark:text-text-mutedDark mt-1">
                    {editUserId
                      ? 'Update user details and department assignments.'
                      : 'Invite a teammate and assign their department responsibilities.'}
                  </p>
                </div>
                <button
                  className="p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg transition-colors"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close add user form"
                >
                  <X className="h-5 w-5 text-text-mainLight dark:text-text-mainDark" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-6">
            <form
              id="user-form"
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault()

                if (!formData.name.trim() || !formData.email.trim()) {
                  toast.error('Name and email are required')
                  return
                }

                // Password is required only when creating a new user
                if (!editUserId && !formData.password.trim()) {
                  toast.error('Password is required when creating a new user')
                  return
                }

                if (!formData.isSuperAdmin && selectedRoles.length === 0) {
                  toast.error('Assign at least one role unless user is a super admin')
                  return
                }

                const submitUser = async () => {
                  setSubmitting(true)
                  try {
                    const payload: any = {
                      name: formData.name.trim(),
                      email: formData.email.trim(),
                      isSuperAdmin: formData.isSuperAdmin,
                      roles: formData.isSuperAdmin ? [] : selectedRoles,
                      siteIds: selectedSiteIds,
                      departmentIds: selectedDepartmentIds,
                    }

                    // Only include password if it's provided (for edit) or required (for create)
                    if (editUserId) {
                      // When editing, only include password if it was changed
                      if (formData.password.trim()) {
                        payload.password = formData.password.trim()
                      }
                      const updatedUser = await usersApi.update(editUserId, payload)
                      setUsers((prev) =>
                        prev.map((user) =>
                          user._id === editUserId ? mapUserResponse(updatedUser) : user
                        )
                      )
                      toast.success('User updated successfully')
                    } else {
                      // When creating, password is required
                      payload.password = formData.password.trim()
                      const savedUser = await usersApi.create(payload)
                      setUsers((prev) => [mapUserResponse(savedUser), ...prev])
                      toast.success('User created successfully')
                    }

                    setIsModalOpen(false)
                    setEditUserId(null)
                    setFormData({
                      name: '',
                      email: '',
                      password: '',
                      isSuperAdmin: false,
                    })
                    setSelectedRoles([])
                    setSelectedSiteIds([])
                    setSelectedDepartmentIds([])
                  } catch (error: any) {
                    toast.error(error.response?.data?.message || 'Failed to save user')
                  } finally {
                    setSubmitting(false)
                  }
                }

                submitUser()
              }}
            >
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark border-b border-border-light dark:border-border-dark pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                    Password {editUserId ? <span className="text-text-mutedLight dark:text-text-mutedDark text-xs font-normal">(leave blank to keep current)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-mainLight dark:text-text-mainDark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editUserId}
                    placeholder={editUserId ? 'Leave blank to keep current password' : 'Enter password (min 6 characters)'}
                  />
                </div>
              </div>

              {/* Permissions Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark border-b border-border-light dark:border-border-dark pb-2">
                  Permissions & Roles
                </h3>
                <div className="bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-lg p-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      id="isSuperAdmin"
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-primary focus:ring-primary focus:ring-2"
                      checked={formData.isSuperAdmin}
                      onChange={(e) => setFormData({ ...formData, isSuperAdmin: e.target.checked })}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-text-mainLight dark:text-text-mainDark">
                        Super Admin
                      </span>
                      <p className="text-xs text-text-mutedLight dark:text-text-mutedDark mt-1">
                        Full platform access across all clients and organizations
                      </p>
                    </div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-3">
                    Roles <span className="text-red-500">*</span>
                    <span className="text-xs font-normal text-text-mutedLight dark:text-text-mutedDark ml-2">
                      (Select at least one unless user is Super Admin)
                    </span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roleOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-3 p-3 border border-border-light dark:border-border-dark rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-primary focus:ring-primary focus:ring-2"
                          checked={selectedRoles.includes(option.value)}
                          disabled={formData.isSuperAdmin}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, option.value])
                            } else {
                              setSelectedRoles(selectedRoles.filter((r) => r !== option.value))
                            }
                          }}
                        />
                        <span className="text-sm text-text-mainLight dark:text-text-mainDark font-medium">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assignments Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-mainLight dark:text-text-mainDark border-b border-border-light dark:border-border-dark pb-2">
                  Assignments
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                      Sites
                      <span className="text-xs font-normal text-text-mutedLight dark:text-text-mutedDark ml-2">
                        ({selectedSiteIds.length} selected)
                      </span>
                    </label>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto border border-border-light dark:border-border-dark rounded-lg p-3 bg-bg-light dark:bg-bg-dark">
                      {sites.length === 0 ? (
                        <p className="text-sm text-text-mutedLight dark:text-text-mutedDark text-center py-4">
                          No sites available
                        </p>
                      ) : (
                        sites.map((site) => (
                          <label
                            key={site._id}
                            className="flex items-center space-x-3 cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark p-2 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-primary focus:ring-primary focus:ring-2"
                              checked={selectedSiteIds.includes(site._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSiteIds([...selectedSiteIds, site._id])
                                } else {
                                  setSelectedSiteIds(selectedSiteIds.filter((id) => id !== site._id))
                                }
                              }}
                            />
                            <div className="flex-1">
                              <span className="text-sm text-text-mainLight dark:text-text-mainDark font-medium">
                                {site.name}
                              </span>
                              {site.code && (
                                <span className="text-xs text-text-mutedLight dark:text-text-mutedDark ml-2">
                                  ({site.code})
                                </span>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-mainLight dark:text-text-mainDark mb-2">
                      Departments
                      <span className="text-xs font-normal text-text-mutedLight dark:text-text-mutedDark ml-2">
                        ({selectedDepartmentIds.length} selected)
                      </span>
                    </label>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto border border-border-light dark:border-border-dark rounded-lg p-3 bg-bg-light dark:bg-bg-dark">
                      {departments.length === 0 ? (
                        <p className="text-sm text-text-mutedLight dark:text-text-mutedDark text-center py-4">
                          No departments available
                        </p>
                      ) : (
                        departments.map((dept) => (
                          <label
                            key={dept._id}
                            className="flex items-center space-x-3 cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark p-2 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-primary focus:ring-primary focus:ring-2"
                              checked={selectedDepartmentIds.includes(dept._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDepartmentIds([...selectedDepartmentIds, dept._id])
                                } else {
                                  setSelectedDepartmentIds(selectedDepartmentIds.filter((id) => id !== dept._id))
                                }
                              }}
                            />
                            <div className="flex-1">
                              <span className="text-sm text-text-mainLight dark:text-text-mainDark font-medium">
                                {dept.name}
                              </span>
                              {dept.isCompliance && (
                                <span className="text-xs text-amber-500 ml-2">(Compliance)</span>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark px-6 py-4 rounded-b-xl">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark text-text-mainLight dark:text-text-mainDark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors font-medium"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="user-form"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-primary dark:bg-primary-light hover:bg-primary-dark text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium shadow-sm"
                >
                  {submitting ? (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </span>
                  ) : (
                    editUserId ? 'Update User' : 'Create User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

