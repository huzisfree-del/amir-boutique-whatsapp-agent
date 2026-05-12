import { useEffect, useState } from 'react'
import { api } from '../api'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Edit2, Building2 } from 'lucide-react'

const BLANK = { name: '', address: '', phone: '', email: '', currency: 'USD', tax_rate: 0, receipt_footer: 'Thank you for your business!', is_active: true }
const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR', 'INR', 'CAD', 'AUD']

export default function Branches() {
  const [branches, setBranches] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => api.getBranches().then(setBranches)
  useEffect(load, [])

  const openNew = () => { setEditing(null); setForm(BLANK); setModal(true) }
  const openEdit = (b) => { setEditing(b); setForm({ ...b, is_active: !!b.is_active }); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (editing) await api.updateBranch(editing.id, form)
      else await api.createBranch(form)
      toast.success(editing ? 'Updated' : 'Branch created')
      setModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Branches</h1><p className="text-gray-500 text-sm">{branches.length} branches</p></div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} />Add Branch</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map(b => (
          <div key={b.id} className={`card p-5 ${!b.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Building2 size={20} /></div>
              <div className="flex items-center gap-2">
                <span className={`badge ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
                <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-blue-600"><Edit2 size={15} /></button>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{b.name}</h3>
            {b.address && <p className="text-sm text-gray-500 mt-1">{b.address}</p>}
            <div className="mt-3 space-y-1 text-sm text-gray-500">
              {b.phone && <p>📞 {b.phone}</p>}
              {b.email && <p>✉️ {b.email}</p>}
              <p>💱 {b.currency} · Tax: {b.tax_rate}%</p>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Branch' : 'Add Branch'} size="lg">
        <form onSubmit={save} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Branch Name *</label><input required value={form.name} onChange={f('name')} className="input" /></div>
          <div className="col-span-2"><label className="label">Address</label><input value={form.address || ''} onChange={f('address')} className="input" /></div>
          <div><label className="label">Phone</label><input value={form.phone || ''} onChange={f('phone')} className="input" /></div>
          <div><label className="label">Email</label><input type="email" value={form.email || ''} onChange={f('email')} className="input" /></div>
          <div><label className="label">Currency</label>
            <select value={form.currency} onChange={f('currency')} className="input">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Tax Rate (%)</label><input type="number" step="0.01" value={form.tax_rate} onChange={f('tax_rate')} className="input" /></div>
          <div className="col-span-2"><label className="label">Receipt Footer</label><textarea value={form.receipt_footer || ''} onChange={f('receipt_footer')} className="input h-20 resize-none" /></div>
          {editing && <div className="col-span-2 flex items-center gap-2"><input type="checkbox" id="ba" checked={!!form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} /><label htmlFor="ba" className="text-sm">Active</label></div>}
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
