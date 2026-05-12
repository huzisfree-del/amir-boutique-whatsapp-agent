import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import {
  LayoutDashboard, ShoppingCart, Package, Tag, ClipboardList,
  Users, Truck, Percent, Receipt, BarChart2, Settings,
  LogOut, Building2, DollarSign, CreditCard, Menu, X, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/pos', icon: ShoppingCart, label: 'POS', highlight: true },
  { divider: 'Inventory' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/purchase-orders', icon: Truck, label: 'Purchase Orders' },
  { divider: 'Sales' },
  { to: '/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/discounts', icon: Percent, label: 'Discounts' },
  { divider: 'Finance' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses' },
  { to: '/cash-drawer', icon: CreditCard, label: 'Cash Drawer' },
  { divider: 'Management' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/users', icon: Users, label: 'Users', roles: ['super_admin', 'admin', 'manager'] },
  { to: '/branches', icon: Building2, label: 'Branches', roles: ['super_admin'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['super_admin', 'admin'] },
]

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-green-100 text-green-700',
  cashier: 'bg-gray-100 text-gray-700',
}

export default function Layout() {
  const { user, branch, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const Sidebar = ({ mobile }) => (
    <div className={`flex flex-col h-full bg-gray-900 text-white ${mobile ? 'w-full' : 'w-64'}`}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">P</div>
          <div>
            <div className="font-bold text-sm leading-tight">POS System</div>
            <div className="text-xs text-gray-400 truncate max-w-[140px]">{branch?.name}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item, i) => {
          if (item.divider) return (
            <div key={i} className="px-3 pt-4 pb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.divider}</span>
            </div>
          )
          if (item.roles && !item.roles.includes(user?.role)) return null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : item.highlight
                    ? 'bg-green-600 text-white hover:bg-green-700 mt-1 mb-1'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColors[user?.role]}`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors p-1">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setOpen(true)} className="text-gray-600"><Menu size={22} /></button>
          <span className="font-semibold text-gray-800">POS System</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
