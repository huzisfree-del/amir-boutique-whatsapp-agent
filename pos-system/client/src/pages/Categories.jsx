import { useEffect, useState } from 'react'
import { api } from '../api'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'

const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#ec4899','#10b981','#ef4444','#06b6d4','#f97316']
const BLANK = { name: '', description: '', color: '#3b82f6' }

export default function Categories() {
  const [cats, setCats] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => api.getCategories().then(setCats)
  useEffect(load, [])

  const openNew = () => { setEditing(null); setForm(BLANK); setModal(true) }
  const openEdit = (c) => { setEditing(c); setForm(c); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (editing) await api.updateCategory(editing.id, form)
      else await api.createCategory(form)
      toast.success(editing ? 'Updated' : 'Created')
      setModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const del = async (c) => {
    if (!confirm(`Delete "${c.name}"?`)) return
    try { await api.deleteCategory(c.id); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.message) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Categories</h1><p className="text-gray-500 text-sm">{cats.length} categories</p></div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} />Add Category</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cats.map(c => (
          <div key={c.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: c.color }} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{c.name}</p>
              <p className="text-xs text-gray-400 truncate">{c.description || 'No description'}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-blue-600"><Edit2 size={15} /></button>
              <button onClick={() => del(c)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Name *</label><input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" /></div>
          <div><label className="label">Description</label><input value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input" /></div>
          <div><label className="label">Color</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
