import { useEffect, useState } from 'react'
import { api } from '../api'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'

const BLANK = { name: '', contact_person: '', email: '', phone: '', address: '', is_active: true }

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => api.getSuppliers().then(setSuppliers)
  useEffect(load, [])

  const openNew = () => { setEditing(null); setForm(BLANK); setModal(true) }
  const openEdit = (s) => { setEditing(s); setForm({ ...s, is_active: !!s.is_active }); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (editing) await api.updateSupplier(editing.id, form)
      else await api.createSupplier(form)
      toast.success(editing ? 'Updated' : 'Created')
      setModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const del = async (s) => {
    if (!confirm(`Remove "${s.name}"?`)) return
    await api.deleteSupplier(s.id); toast.success('Removed'); load()
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Suppliers</h1><p className="text-gray-500 text-sm">{suppliers.length} suppliers</p></div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} />Add Supplier</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <div key={s.id} className={`card p-4 ${!s.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold">{s.name[0]}</div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-600"><Edit2 size={15} /></button>
                <button onClick={() => del(s)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800">{s.name}</h3>
            {s.contact_person && <p className="text-sm text-gray-500">{s.contact_person}</p>}
            {s.email && <p className="text-xs text-blue-500 mt-1">{s.email}</p>}
            {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
            {!s.is_active && <span className="badge bg-gray-100 text-gray-500 mt-2">Inactive</span>}
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Company Name *</label><input required value={form.name} onChange={f('name')} className="input" /></div>
          <div><label className="label">Contact Person</label><input value={form.contact_person || ''} onChange={f('contact_person')} className="input" /></div>
          <div><label className="label">Email</label><input type="email" value={form.email || ''} onChange={f('email')} className="input" /></div>
          <div><label className="label">Phone</label><input value={form.phone || ''} onChange={f('phone')} className="input" /></div>
          <div><label className="label">Address</label><textarea value={form.address || ''} onChange={f('address')} className="input h-20 resize-none" /></div>
          {editing && <div className="flex items-center gap-2"><input type="checkbox" id="sa" checked={!!form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} /><label htmlFor="sa" className="text-sm text-gray-700">Active</label></div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
