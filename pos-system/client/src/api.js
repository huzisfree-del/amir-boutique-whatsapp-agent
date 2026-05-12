const BASE = '/api'

const getToken = () => localStorage.getItem('pos_token')

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  // Auth
  login: (body) => req('POST', '/auth/login', body),
  me: () => req('GET', '/auth/me'),
  changePassword: (body) => req('PUT', '/auth/me/password', body),

  // Branches
  getBranches: () => req('GET', '/branches'),
  createBranch: (body) => req('POST', '/branches', body),
  updateBranch: (id, body) => req('PUT', `/branches/${id}`, body),
  deleteBranch: (id) => req('DELETE', `/branches/${id}`),

  // Users
  getUsers: () => req('GET', '/users'),
  createUser: (body) => req('POST', '/users', body),
  updateUser: (id, body) => req('PUT', `/users/${id}`, body),
  deleteUser: (id) => req('DELETE', `/users/${id}`),

  // Products
  getProducts: (params) => req('GET', '/products?' + new URLSearchParams(params || {})),
  createProduct: (body) => req('POST', '/products', body),
  updateProduct: (id, body) => req('PUT', `/products/${id}`, body),
  adjustStock: (id, body) => req('PATCH', `/products/${id}/stock`, body),
  deleteProduct: (id) => req('DELETE', `/products/${id}`),

  // Categories
  getCategories: () => req('GET', '/categories'),
  createCategory: (body) => req('POST', '/categories', body),
  updateCategory: (id, body) => req('PUT', `/categories/${id}`, body),
  deleteCategory: (id) => req('DELETE', `/categories/${id}`),

  // Orders
  getOrders: (params) => req('GET', '/orders?' + new URLSearchParams(params || {})),
  getOrder: (id) => req('GET', `/orders/${id}`),
  createOrder: (body) => req('POST', '/orders', body),
  refundOrder: (id) => req('PATCH', `/orders/${id}/refund`),

  // Customers
  getCustomers: (params) => req('GET', '/customers?' + new URLSearchParams(params || {})),
  getCustomer: (id) => req('GET', `/customers/${id}`),
  createCustomer: (body) => req('POST', '/customers', body),
  updateCustomer: (id, body) => req('PUT', `/customers/${id}`, body),
  deleteCustomer: (id) => req('DELETE', `/customers/${id}`),

  // Suppliers
  getSuppliers: () => req('GET', '/suppliers'),
  createSupplier: (body) => req('POST', '/suppliers', body),
  updateSupplier: (id, body) => req('PUT', `/suppliers/${id}`, body),
  deleteSupplier: (id) => req('DELETE', `/suppliers/${id}`),

  // Discounts
  getDiscounts: () => req('GET', '/discounts'),
  validateDiscount: (body) => req('POST', '/discounts/validate', body),
  createDiscount: (body) => req('POST', '/discounts', body),
  updateDiscount: (id, body) => req('PUT', `/discounts/${id}`, body),
  deleteDiscount: (id) => req('DELETE', `/discounts/${id}`),

  // Expenses
  getExpenses: (params) => req('GET', '/expenses?' + new URLSearchParams(params || {})),
  createExpense: (body) => req('POST', '/expenses', body),
  deleteExpense: (id) => req('DELETE', `/expenses/${id}`),

  // Purchase Orders
  getPurchaseOrders: () => req('GET', '/purchase-orders'),
  getPurchaseOrder: (id) => req('GET', `/purchase-orders/${id}`),
  createPurchaseOrder: (body) => req('POST', '/purchase-orders', body),
  receivePurchaseOrder: (id) => req('PATCH', `/purchase-orders/${id}/receive`),
  cancelPurchaseOrder: (id) => req('PATCH', `/purchase-orders/${id}/cancel`),

  // Reports
  getDashboard: () => req('GET', '/reports/dashboard'),
  getSalesReport: (params) => req('GET', '/reports/sales?' + new URLSearchParams(params || {})),
  getProductsReport: (params) => req('GET', '/reports/products?' + new URLSearchParams(params || {})),
  getCashiersReport: (params) => req('GET', '/reports/cashiers?' + new URLSearchParams(params || {})),
  getInventoryReport: () => req('GET', '/reports/inventory'),
  getExpensesReport: (params) => req('GET', '/reports/expenses?' + new URLSearchParams(params || {})),

  // Settings
  getSettings: () => req('GET', '/settings'),
  updateSettings: (body) => req('PUT', '/settings', body),

  // Cash Drawers
  getCurrentDrawer: () => req('GET', '/cash-drawers/current'),
  getDrawers: () => req('GET', '/cash-drawers'),
  openDrawer: (body) => req('POST', '/cash-drawers/open', body),
  closeDrawer: (body) => req('POST', '/cash-drawers/close', body),
}
