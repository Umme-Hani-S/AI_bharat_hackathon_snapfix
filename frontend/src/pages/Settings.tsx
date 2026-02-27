import { useAuthStore } from '../store/authStore'
import { User, Mail, Building2, Shield, Save, Edit } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: 'Acme Corporation',
    companyEmail: 'contact@acme.com',
    companyAddress: '123 Business St, City, State 12345',
  })

  const handleSave = () => {
    // Save logic here
    setEditing(false)
    toast.success('Settings saved successfully')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark-text">Settings</h1>
        <p className="text-dark-text-muted mt-1">Manage your account and client details</p>
      </div>

      {/* User Details */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-dark-text">User Details</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-600 rounded-full w-16 h-16 flex items-center justify-center text-white font-medium text-xl">
              {getInitials(formData.name)}
            </div>
            <div>
              <p className="text-sm text-dark-text-muted">Profile Picture</p>
              <button className="text-primary-600 text-sm hover:underline">Change</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                <User className="h-4 w-4 inline mr-2" />
                Full Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              ) : (
                <p className="text-dark-text">{formData.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              ) : (
                <p className="text-dark-text">{formData.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                <Shield className="h-4 w-4 inline mr-2" />
                Role
              </label>
              <p className="text-dark-text">Admin</p>
            </div>
          </div>

          {editing && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-dark-border">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-dark-surface text-dark-text rounded-lg hover:bg-dark-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Client Details */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-dark-text">Client Details</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                <Building2 className="h-4 w-4 inline mr-2" />
                Company Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              ) : (
                <p className="text-dark-text">{formData.company}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Company Email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.companyEmail}
                  onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              ) : (
                <p className="text-dark-text">{formData.companyEmail}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-text mb-2">
                <Building2 className="h-4 w-4 inline mr-2" />
                Company Address
              </label>
              {editing ? (
                <textarea
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              ) : (
                <p className="text-dark-text">{formData.companyAddress}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-dark-border">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-dark-surface text-dark-text rounded-lg hover:bg-dark-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

