const deriveUserRole = (user = {}) => {
  if (user.isSaasOwner) return 'saas-owner'
  if (user.isSuperAdmin) return 'superadmin'
  if (user.isClientAdmin) return 'client'

  if (Array.isArray(user.roles) && user.roles.length > 0) {
    // Priority: head-of-staff > field-staff > vendors > tenants
    if (user.roles.includes('head-of-staff')) return 'head-of-staff'
    if (user.roles.includes('field-staff')) return 'field-staff'
    if (user.roles.includes('vendors')) return 'vendors'
    if (user.roles.includes('tenants')) return 'tenants'
  }

  return 'field-staff'
}

module.exports = { deriveUserRole }


