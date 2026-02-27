import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clientsApi, CreateClientData } from '../api/clients'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Save, Check } from 'lucide-react'

export default function ClientForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    status: 'active',
    subscriptionTier: 'basic',
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (isEdit && id) {
      loadClient()
    }
  }, [id, isEdit])

  const loadClient = async () => {
    try {
      const client = await clientsApi.getById(id!)
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        companyName: client.companyName,
        address: client.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
        status: client.status,
        subscriptionTier: client.subscriptionTier,
      })
    } catch (error: any) {
      toast.error('Failed to load client')
      navigate('/clients')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!isEdit) {
        if (!password || password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        if (password !== confirmPassword) {
          toast.error('Passwords do not match')
          setLoading(false)
          return
        }
      } else if (password) {
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        if (password !== confirmPassword) {
          toast.error('Passwords do not match')
          setLoading(false)
          return
        }
      }

      const payload: CreateClientData = {
        ...formData,
      }

      if (password) {
        payload.password = password
      }

      if (isEdit && id) {
        await clientsApi.update(id, payload)
        toast.success('Client updated successfully')
      } else {
        await clientsApi.create(payload)
        toast.success('Client created successfully')
      }
      navigate('/clients')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save client')
    } finally {
      setLoading(false)
    }
  }

  const handleAddressChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        [field]: value,
      },
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center space-x-2 text-dark-text-muted hover:text-dark-text"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Clients</span>
      </button>

      <div>
        <h1 className="text-3xl font-bold text-dark-text">
          {isEdit ? 'Edit Client' : 'Add New Client'}
        </h1>
        <p className="text-dark-text-muted mt-1">
          {isEdit ? 'Update client information' : 'Create a new client organization'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-semibold text-dark-text mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Contact Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="contact@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Acme Corporation"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h2 className="text-xl font-semibold text-dark-text mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-text mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address?.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="123 Business St"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">City</label>
              <input
                type="text"
                value={formData.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="New York"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">State</label>
              <input
                type="text"
                value={formData.address?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="NY"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">ZIP Code</label>
              <input
                type="text"
                value={formData.address?.zipCode || ''}
                onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="10001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">Country</label>
              <input
                type="text"
                value={formData.address?.country || ''}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="United States"
              />
            </div>
          </div>
        </div>

        {/* Password Fields */}
        {isEdit ? (
          <div>
            <h2 className="text-xl font-semibold text-dark-text mb-4">Update Client Password</h2>
            <p className="text-sm text-dark-text-muted mb-4">
              Leave blank if you do not want to change the password.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Leave blank to keep existing"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Re-enter new password"
                  minLength={6}
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
                <p className="text-xs text-dark-text-muted mt-1">
                  Password for the client admin account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Re-enter password"
                  minLength={6}
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        <div>
          <h2 className="text-xl font-semibold text-dark-text mb-4">Status</h2>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-dark-text mb-2">Client Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Subscription Plans */}
        <div>
          <h2 className="text-xl font-semibold text-dark-text mb-4">Subscription Plan</h2>
          <p className="text-sm text-dark-text-muted mb-6">Select a subscription plan for this client</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter Plan */}
            <div
              onClick={() => setFormData({ ...formData, subscriptionTier: 'basic' })}
              className={`relative bg-white dark:bg-surface-dark border-2 rounded-xl p-6 cursor-pointer transition-all ${
                formData.subscriptionTier === 'basic'
                  ? 'border-primary shadow-lg'
                  : 'border-border-light dark:border-border-dark hover:border-primary/50'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-text-mainLight dark:text-text-mainDark">Starter</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">$29</span>
                  <span className="text-text-mutedLight dark:text-text-mutedDark">/month</span>
                </div>
                <p className="text-sm text-text-mutedLight dark:text-text-mutedDark mt-2">
                  Perfect for small teams getting started
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {[
                  'Up to 100 tickets/month',
                  '5 team members',
                  'Basic AI classification',
                  'Email notifications',
                  '7-day ticket history',
                  'Community support',
                ].map((feature) => (
                  <li key={feature} className="flex items-start space-x-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-mainLight dark:text-text-mainDark">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {formData.subscriptionTier === 'basic' && (
                <div className="absolute top-4 right-4">
                  <div className="bg-primary text-white text-xs font-medium px-2 py-1 rounded-full">
                    Selected
                  </div>
                </div>
              )}
            </div>

            {/* Professional Plan - Most Popular */}
            <div
              onClick={() => setFormData({ ...formData, subscriptionTier: 'professional' })}
              className={`relative bg-white dark:bg-surface-dark border-2 rounded-xl p-6 cursor-pointer transition-all ${
                formData.subscriptionTier === 'professional'
                  ? 'border-primary shadow-lg'
                  : 'border-border-light dark:border-border-dark hover:border-primary/50'
              }`}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-xl font-bold text-text-mainLight dark:text-text-mainDark">Professional</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">$99</span>
                  <span className="text-text-mutedLight dark:text-text-mutedDark">/month</span>
                </div>
                <p className="text-sm text-text-mutedLight dark:text-text-mutedDark mt-2">
                  For growing teams that need more power
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {[
                  'Unlimited tickets',
                  '25 team members',
                  'Advanced AI triage & routing',
                  'SLA management',
                  'Real-time dashboards',
                  '90-day ticket history',
                  'Priority email support',
                  'API access',
                ].map((feature) => (
                  <li key={feature} className="flex items-start space-x-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-mainLight dark:text-text-mainDark">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {formData.subscriptionTier === 'professional' && (
                <div className="absolute top-4 right-4">
                  <div className="bg-primary text-white text-xs font-medium px-2 py-1 rounded-full">
                    Selected
                  </div>
                </div>
              )}
            </div>

            {/* Enterprise Plan */}
            <div
              onClick={() => setFormData({ ...formData, subscriptionTier: 'enterprise' })}
              className={`relative bg-white dark:bg-surface-dark border-2 rounded-xl p-6 cursor-pointer transition-all ${
                formData.subscriptionTier === 'enterprise'
                  ? 'border-primary shadow-lg'
                  : 'border-border-light dark:border-border-dark hover:border-primary/50'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-text-mainLight dark:text-text-mainDark">Enterprise</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-text-mainLight dark:text-text-mainDark">Custom</span>
                </div>
                <p className="text-sm text-text-mutedLight dark:text-text-mutedDark mt-2">
                  For large organizations with complex needs
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {[
                  'Everything in Professional',
                  'Unlimited team members',
                  'Custom AI model training',
                  'Multi-site management',
                  'Advanced analytics',
                  'Unlimited history',
                  '24/7 phone support',
                  'Dedicated account manager',
                  'Custom integrations',
                ].map((feature) => (
                  <li key={feature} className="flex items-start space-x-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-mainLight dark:text-text-mainDark">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {formData.subscriptionTier === 'enterprise' && (
                <div className="absolute top-4 right-4">
                  <div className="bg-primary text-white text-xs font-medium px-2 py-1 rounded-full">
                    Selected
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-dark-border">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="px-4 py-2 bg-dark-surface text-dark-text rounded-lg hover:bg-dark-border transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving...' : isEdit ? 'Update Client' : 'Create Client'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

