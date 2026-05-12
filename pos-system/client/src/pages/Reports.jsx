import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import { useAuth } from '../store/auth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { Download } from 'lucide-react'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

const TABS = ['Sales', 'Products', 'Cashiers', 'Inventory', 'Expenses']

export default function Reports() {
  const { branch } = useAuth()
  const currency = branch?.currency || 'USD'
  const [tab, setTab] = useState('Sales')
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [groupBy, setGroupBy] = useState('day')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true); setData(null)
    try {
      const params = { from, to }
      let result
      if (tab === 'Sales') result = await api.getSalesReport({ ...params, group_by: groupBy })
      else if (tab === 'Products') result = await api.getProductsReport(params)
      else if (tab === 'Cashiers') result = await api.getCashiersReport(params)
      else if (tab === 'Inventory') result = await api.getInventoryReport()
      else if (tab === 'Expenses') result = await api.getExpensesReport(params)
      setData(result)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab, from, to, groupBy])

  const exportCSV = (rows, filename) => {
    if (!rows?.length) return
    const keys = Object.keys(rows[0])
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${filename}.csv`; a.click()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Reports</h1><p className="text-gray-500 text-sm">Analytics & insights</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {/* Filters */}
      {tab !== 'Inventory' && (
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div><label className="label text-xs">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input w-auto" /></div>
          <div><label className="label text-xs">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="input w-auto" /></div>
          {tab === 'Sales' && (
            <div><label className="label text-xs">Group By</label>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="input w-auto">
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          )}
          <button onClick={load} className="btn-secondary">Refresh</button>
          {data && <button onClick={() => exportCSV(Array.isArray(data) ? data : data.products || data.breakdown, `${tab.toLowerCase()}-report`)} className="btn-secondary gap-2"><Download size={15} />Export CSV</button>}
        </div>
      )}

      {loading && <div className="text-center py-20 text-gray-400">Loading...</div>}

      {/* Sales Tab */}
      {!loading && tab === 'Sales' && Array.isArray(data) && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: fmt.currency(data.reduce((s, d) => s + d.revenue, 0), currency) },
              { label: 'Total Orders', value: fmt.number(data.reduce((s, d) => s + d.orders, 0)) },
              { label: 'Total Tax', value: fmt.currency(data.reduce((s, d) => s + d.tax, 0), currency) },
              { label: 'Total Discounts', value: fmt.currency(data.reduce((s, d) => s + d.discounts, 0), currency) },
            ].map(c => (
              <div key={c.label} className="card p-4"><p className="text-xs text-gray-500">{c.label}</p><p className="text-xl font-bold mt-1">{c.value}</p></div>
            ))}
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Revenue Over Time</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={60} />
                <Tooltip formatter={v => fmt.currency(v, currency)} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-head"><th className="px-4 py-3 text-left">Period</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3 text-right">Tax</th><th className="px-4 py-3 text-right">Discounts</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{d.period}</td>
                    <td className="px-4 py-2.5 text-right">{d.orders}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-blue-600">{fmt.currency(d.revenue, currency)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt.currency(d.tax, currency)}</td>
                    <td className="px-4 py-2.5 text-right text-green-600">-{fmt.currency(d.discounts, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {!loading && tab === 'Products' && Array.isArray(data) && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-head"><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Qty Sold</th><th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Profit</th><th className="px-4 py-3 text-right">Stock</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-right">{fmt.number(p.qty_sold)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-blue-600">{fmt.currency(p.revenue, currency)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{fmt.currency(p.revenue - (p.profit || 0), currency)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{fmt.currency(p.profit, currency)}</td>
                  <td className="px-4 py-2.5 text-right">{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && <div className="text-center py-8 text-gray-400">No sales in this period</div>}
        </div>
      )}

      {/* Cashiers Tab */}
      {!loading && tab === 'Cashiers' && Array.isArray(data) && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-head"><th className="px-4 py-3 text-left">Cashier</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Revenue</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-right">{fmt.number(c.orders)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-blue-600">{fmt.currency(c.revenue, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inventory Tab */}
      {!loading && tab === 'Inventory' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Products', value: fmt.number(data.summary?.total_products) },
              { label: 'Cost Value', value: fmt.currency(data.summary?.total_cost_value, currency) },
              { label: 'Retail Value', value: fmt.currency(data.summary?.total_retail_value, currency) },
              { label: 'Low Stock', value: fmt.number(data.summary?.low_stock_count) },
              { label: 'Out of Stock', value: fmt.number(data.summary?.out_of_stock) },
            ].map(c => (
              <div key={c.label} className="card p-4"><p className="text-xs text-gray-500">{c.label}</p><p className="text-xl font-bold mt-1">{c.value}</p></div>
            ))}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-head"><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Cost Value</th><th className="px-4 py-3 text-right">Retail Value</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {data.products?.map((p, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${p.stock <= p.low_stock_alert ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.category_name || '—'}</td>
                    <td className="px-4 py-2.5 text-right"><span className={p.stock === 0 ? 'text-red-600 font-bold' : p.stock <= p.low_stock_alert ? 'text-amber-600 font-medium' : ''}>{p.stock}</span></td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{fmt.currency(p.cost, currency)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt.currency(p.price, currency)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt.currency(p.stock_value, currency)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-blue-600">{fmt.currency(p.retail_value, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {!loading && tab === 'Expenses' && data && (
        <div className="space-y-4">
          <div className="card p-4 inline-block"><p className="text-xs text-gray-500">Total Expenses</p><p className="text-2xl font-bold text-red-600 mt-1">{fmt.currency(data.total, currency)}</p></div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-head"><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-right">Count</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {data.breakdown?.map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{e.category}</td>
                    <td className="px-4 py-2.5 text-right">{e.count}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-red-600">{fmt.currency(e.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
