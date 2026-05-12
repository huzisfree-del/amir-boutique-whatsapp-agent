import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import StatCard from '../components/ui/StatCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { DollarSign, ShoppingCart, Users, Package, AlertTriangle, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../store/auth'

const STATUS_COLORS = { cash: '#3b82f6', card: '#8b5cf6', split: '#f59e0b' }
const DAY_COLORS = ['#3b82f6']

export default function Dashboard() {
  const { branch } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-6 text-center text-gray-400">Loading dashboard...</div>
  )
  if (!data) return null

  const currency = branch?.currency || 'USD'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome back — here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Sales" value={fmt.currency(data.todaySales?.total, currency)} sub={`${data.todaySales?.count} orders`} icon={DollarSign} color="green" />
        <StatCard label="Month Sales" value={fmt.currency(data.monthSales?.total, currency)} sub={`${data.monthSales?.count} orders`} icon={TrendingUp} color="blue" />
        <StatCard label="Customers" value={fmt.number(data.totalCustomers?.count)} icon={Users} color="purple" />
        <StatCard label="Products" value={fmt.number(data.totalProducts?.count)} sub={`${data.lowStock?.count} low stock`} icon={Package} color="amber" />
      </div>

      {/* Low stock alert */}
      {data.lowStock?.count > 0 && (
        <Link to="/products?low_stock=1" className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm hover:bg-amber-100 transition">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span><strong>{data.lowStock.count} products</strong> are running low on stock — click to review</span>
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sales last 7 days */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-700 mb-4">Sales — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.salesLast7} barSize={32}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={55} />
              <Tooltip formatter={v => fmt.currency(v, currency)} labelFormatter={l => fmt.date(l)} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment breakdown */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Payment Methods (This Month)</h2>
          {data.paymentBreakdown?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.paymentBreakdown} dataKey="total" nameKey="payment_method" cx="50%" cy="50%" outerRadius={80} label={({ payment_method, percent }) => `${payment_method} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.paymentBreakdown.map((entry, i) => (
                    <Cell key={i} fill={Object.values(STATUS_COLORS)[i % 3]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => fmt.currency(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center mt-8">No sales this month</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Top Products (This Month)</h2>
          {data.topProducts?.length ? (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{fmt.number(p.qty_sold)} units sold</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{fmt.currency(p.revenue, currency)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm text-center mt-4">No sales yet</p>}
        </div>

        {/* Recent orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Recent Orders</h2>
            <Link to="/orders" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {data.recentOrders?.slice(0, 6).map(o => (
              <div key={o.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{o.order_number}</p>
                  <p className="text-xs text-gray-400">{o.customer_name || 'Walk-in'} · {fmt.datetime(o.created_at)}</p>
                </div>
                <span className={`badge ${o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'refunded' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                <span className="text-sm font-semibold">{fmt.currency(o.total, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
