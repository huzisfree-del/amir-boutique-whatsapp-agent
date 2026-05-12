import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Search, Eye, RotateCcw, Printer } from 'lucide-react'

const STATUS_BADGE = { completed: 'bg-green-100 text-green-700', refunded: 'bg-red-100 text-red-700', held: 'bg-amber-100 text-amber-700' }

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [detail, setDetail] = useState(null)
  const [filters, setFilters] = useState({ from: '', to: '', status: '' })
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.getOrders(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
      .then(setOrders).finally(() => setLoading(false))
  }
  useEffect(load, [filters])

  const openDetail = async (o) => {
    const full = await api.getOrder(o.id)
    setDetail(full)
  }

  const refund = async (o) => {
    if (!confirm(`Refund order ${o.order_number}?`)) return
    await api.refundOrder(o.id); toast.success('Refunded'); load(); setDetail(null)
  }

  const f = (k) => (e) => setFilters(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Orders</h1><p className="text-gray-500 text-sm">{orders.length} orders</p></div>
      </div>

      <div className="card mb-4">
        <div className="p-4 flex flex-wrap gap-3">
          <input type="date" value={filters.from} onChange={f('from')} className="input w-auto" placeholder="From" />
          <input type="date" value={filters.to} onChange={f('to')} className="input w-auto" />
          <select value={filters.status} onChange={f('status')} className="input w-auto">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="refunded">Refunded</option>
            <option value="held">Held</option>
          </select>
          <button onClick={load} className="btn-secondary">Refresh</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-head">
              <th className="px-4 py-3 text-left">Order #</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Cashier</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-center">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-blue-600">{o.order_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.customer_name || 'Walk-in'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.cashier_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{fmt.datetime(o.created_at)}</td>
                  <td className="px-4 py-3 text-center"><span className="badge bg-blue-50 text-blue-600 capitalize">{o.payment_method}</span></td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt.currency(o.total)}</td>
                  <td className="px-4 py-3 text-center"><span className={`badge ${STATUS_BADGE[o.status]}`}>{o.status}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openDetail(o)} className="text-gray-400 hover:text-blue-600"><Eye size={15} /></button>
                      {o.status === 'completed' && <button onClick={() => refund(o)} className="text-gray-400 hover:text-red-600"><RotateCcw size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && orders.length === 0 && <div className="text-center py-12 text-gray-400">No orders found</div>}
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Order — ${detail?.order_number}`} size="md">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Customer</span><p className="font-medium">{detail.customer_name || 'Walk-in'}</p></div>
              <div><span className="text-gray-500">Cashier</span><p className="font-medium">{detail.cashier_name}</p></div>
              <div><span className="text-gray-500">Date</span><p className="font-medium">{fmt.datetime(detail.created_at)}</p></div>
              <div><span className="text-gray-500">Payment</span><p className="font-medium capitalize">{detail.payment_method}</p></div>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-center">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {detail.items?.map((i, idx) => (
                    <tr key={idx}><td className="px-3 py-2">{i.name}</td><td className="px-3 py-2 text-center">{i.quantity}</td><td className="px-3 py-2 text-right">{fmt.currency(i.price)}</td><td className="px-3 py-2 text-right font-medium">{fmt.currency(i.subtotal)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt.currency(detail.subtotal)}</span></div>
              {detail.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{fmt.currency(detail.discount_amount)}</span></div>}
              {detail.tax_amount > 0 && <div className="flex justify-between text-gray-500"><span>Tax</span><span>{fmt.currency(detail.tax_amount)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-1.5"><span>Total</span><span>{fmt.currency(detail.total)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Paid</span><span>{fmt.currency(detail.paid_amount)}</span></div>
              {detail.change_amount > 0 && <div className="flex justify-between"><span>Change</span><span>{fmt.currency(detail.change_amount)}</span></div>}
            </div>
            {detail.status === 'completed' && (
              <button onClick={() => refund(detail)} className="btn-danger w-full justify-center"><RotateCcw size={15} />Refund Order</button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
