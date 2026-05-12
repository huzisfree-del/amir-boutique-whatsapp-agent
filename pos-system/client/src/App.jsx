import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import Login from './pages/Login'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'
import Discounts from './pages/Discounts'
import Expenses from './pages/Expenses'
import PurchaseOrders from './pages/PurchaseOrders'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Branches from './pages/Branches'
import Settings from './pages/Settings'
import CashDrawer from './pages/CashDrawer'

function PrivateRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { init, loading, user } = useAuth()
  useEffect(() => { init() }, [])
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading POS System...</p>
      </div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="discounts" element={<Discounts />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="reports" element={<Reports />} />
        <Route path="cash-drawer" element={<CashDrawer />} />
        <Route path="users" element={<PrivateRoute roles={['super_admin','admin','manager']}><Users /></PrivateRoute>} />
        <Route path="branches" element={<PrivateRoute roles={['super_admin']}><Branches /></PrivateRoute>} />
        <Route path="settings" element={<PrivateRoute roles={['super_admin','admin']}><Settings /></PrivateRoute>} />
      </Route>
    </Routes>
  )
}
