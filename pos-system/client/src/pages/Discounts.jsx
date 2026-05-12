import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'

const BLANK = { name: '', code: '', type: 'percentage', value: '', min_order: '', max_uses: '', starts_at: '', expires_at: '', is_active: true }

export default function Discounts() {
  const [discounts, setDiscounts] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => api.getDiscounts().then(setDiscounts)
  useEffect(load, [])

  const openNew = () => { setEditing(null); setForm(BLANK); setModal(true) }
  const openEdit = (d) => { setEditing(d); setForm({ ...d, is_active: !!d.is_active }); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (editing) await api.updateDiscount(editing.id, form)
      else await api.createDiscount(form)
      toast.success(editing ? 'Updated' : 'Created')
      setModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const del = async (d) => {
    if (!confirm(`Delete "${d.name}"?`)) return
    await api.deleteDiscount(d.id); toast.success('Deleted'); load()
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Discounts & Coupons</h1><p className="text-gray-500 text-sm">{discounts.length} discounts</p></div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} />Add Discount</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {discounts.map(d => (
          <div key={d.id} className={`card p-4 ${!d.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-xl"><Tag size={18} /></div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(d)} className="text-gray-400 hover:text-blue-600"><Edit2 size={15} /></button>
                <button onClick={() => del(d)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800">{d.name}</h3>
            {d.code && <p className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded mt-1 inline-block">{d.code}</p>}
            <p className="text-2xl font-bold text-green-600 mt-2">
              {d.type === 'percentage' ? `${d.value}%` : fmt.currency(d.value)} off
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-gray-400">
              {d.min_order > 0 && <p>Min order: {fmt.currency(d.min_order)}</p>}
              {d.max_uses && <p>Uses: {d.uses}/{d.max_uses}</p>}
              {d.expires_at && <p>Expires: {fmt.date(d.expires_at)}</p>}
            </div>
            <div className="mt-2">
              <span className={`badge ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{d.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
        {discounts.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No discounts yet</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Discount' : 'Add Discount'}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Name *</label><input required value={form.name} onChange={f('name')} className="input" /></div>
          <div><label className="label">Coupon Code</label><input value={form.code || ''} onChange={f('code')} className="input font-mono" placeholder="SAVE10" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label>
              <select value={form.type} onChange={f('type')} className="input">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div><label className="label">Value *</label><input required type="number" step="0.01" value={form.value} onChange={f('value')} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Min Order Amount</label><input type="number" step="0.01" value={form.min_order || ''} onChange={f('min_order')} className="input" /></div>
            <div><label className="label">Max Uses</label><input type="number" value={form.max_uses || ''} onChange={f('max_uses')} className="input" placeholder="Unlimited" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date</label><input type="date" value={form.starts_at || ''} onChange={f('starts_at')} className="input" /></div>
            <div><label className="label">Expiry Date</label><input type="date" value={form.expires_at || ''} onChange={f('expires_at')} className="input" /></div>
          </div>
          {editing && <div className="flex items-center gap-2"><input type="checkbox" id="da" checked={!!form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} /><label htmlFor="da" className="text-sm">Active</label></div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
