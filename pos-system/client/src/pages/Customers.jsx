import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, Eye, Star } from 'lucide-react'

const BLANK = { name: '', email: '', phone: '', address: '', notes: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [detailModal, setDetailModal] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => api.getCustomers(search ? { search } : {}).then(setCustomers)
  useEffect(load, [search])

  const openNew = () => { setEditing(null); setForm(BLANK); setModal(true) }
  const openEdit = (c) => { setEditing(c); setForm(c); setModal(true) }
  const openDetail = async (c) => { const full = await api.getCustomer(c.id); setDetailModal(full) }

  const save = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (editing) await api.updateCustomer(editing.id, { ...form, loyalty_points: editing.loyalty_points })
      else await api.createCustomer(form)
      toast.success(editing ? 'Updated' : 'Created')
      setModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const del = async (c) => {
    if (!confirm(`Delete "${c.name}"?`)) return
    await api.deleteCustomer(c.id); toast.success('Deleted'); load()
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Customers</h1><p className="text-gray-500 text-sm">{customers.length} customers</p></div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} />Add Customer</button>
      </div>

      <div className="card">
        <div className="p-4">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone..." className="input pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-head">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-right">Total Spent</th>
              <th className="px-4 py-3 text-center">Points</th>
              <th className="px-4 py-3 text-center">Since</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">{c.name[0]?.toUpperCase()}</div>
                      <span className="font-medium text-gray-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500"><p>{c.email || '—'}</p><p>{c.phone || '—'}</p></td>
                  <td className="px-4 py-3 text-right font-medium">{fmt.currency(c.total_spent)}</td>
                  <td className="px-4 py-3 text-center"><span className="badge bg-amber-100 text-amber-700"><Star size={11} className="mr-1" />{c.loyalty_points}</span></td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">{fmt.date(c.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openDetail(c)} className="text-gray-400 hover:text-blue-600"><Eye size={15} /></button>
                      <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-blue-600"><Edit2 size={15} /></button>
                      <button onClick={() => del(c)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && <div className="text-center py-12 text-gray-400">No customers found</div>}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Name *</label><input required value={form.name} onChange={f('name')} className="input" /></div>
          <div><label className="label">Email</label><input type="email" value={form.email || ''} onChange={f('email')} className="input" /></div>
          <div><label className="label">Phone</label><input value={form.phone || ''} onChange={f('phone')} className="input" /></div>
          <div><label className="label">Address</label><input value={form.address || ''} onChange={f('address')} className="input" /></div>
          <div><label className="label">Notes</label><textarea value={form.notes || ''} onChange={f('notes')} className="input h-20 resize-none" /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.name} size="lg">
        {detailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Email</span><p className="font-medium">{detailModal.email || '—'}</p></div>
              <div><span className="text-gray-500">Phone</span><p className="font-medium">{detailModal.phone || '—'}</p></div>
              <div><span className="text-gray-500">Total Spent</span><p className="font-bold text-lg text-blue-600">{fmt.currency(detailModal.total_spent)}</p></div>
              <div><span className="text-gray-500">Loyalty Points</span><p className="font-bold text-lg text-amber-600">{detailModal.loyalty_points} pts</p></div>
              {detailModal.address && <div className="col-span-2"><span className="text-gray-500">Address</span><p className="font-medium">{detailModal.address}</p></div>}
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Recent Orders</h3>
              {detailModal.orders?.length ? (
                <div className="space-y-1">
                  {detailModal.orders.map(o => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                      <span className="font-medium text-blue-600">{o.order_number}</span>
                      <span className="text-gray-400">{fmt.datetime(o.created_at)}</span>
                      <span className={`badge ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{o.status}</span>
                      <span className="font-semibold">{fmt.currency(o.total)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No orders yet</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
