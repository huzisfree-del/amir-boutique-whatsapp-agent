import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Shield } from 'lucide-react'
import { useAuth } from '../store/auth'

const ROLES = ['admin', 'manager', 'cashier']
const SUPER_ADMIN_ROLES = ['super_admin', 'admin', 'manager', 'cashier']
const ROLE_COLORS = { super_admin: 'bg-purple-100 text-purple-700', admin: 'bg-blue-100 text-blue-700', manager: 'bg-green-100 text-green-700', cashier: 'bg-gray-100 text-gray-700' }
const BLANK = { name: '', email: '', password: '', role: 'cashier', phone: '', branch_id: '', is_active: true }

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => { api.getUsers().then(setUsers); if (me?.role === 'super_admin') api.getBranches().then(setBranches) }
  useEffect(load, [])

  const openNew = () => { setEditing(null); setForm(BLANK); setModal(true) }
  const openEdit = (u) => { setEditing(u); setForm({ ...u, password: '', is_active: !!u.is_active }); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (editing) await api.updateUser(editing.id, form)
      else await api.createUser(form)
      toast.success(editing ? 'Updated' : 'Created')
      setModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const del = async (u) => {
    if (!confirm(`Deactivate "${u.name}"?`)) return
    await api.deleteUser(u.id); toast.success('Deactivated'); load()
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const roles = me?.role === 'super_admin' ? SUPER_ADMIN_ROLES : ROLES

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Users</h1><p className="text-gray-500 text-sm">{users.length} users</p></div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} />Add User</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr className="table-head">
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-center">Role</th>
            <th className="px-4 py-3 text-left">Phone</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Since</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">{u.name[0]?.toUpperCase()}</div>
                    <span className="font-medium text-gray-800">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-center"><span className={`badge ${ROLE_COLORS[u.role]}`}><Shield size={11} className="mr-1" />{u.role.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.phone || '—'}</td>
                <td className="px-4 py-3 text-center"><span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">{fmt.date(u.created_at)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-blue-600"><Edit2 size={15} /></button>
                    {u.id !== me?.id && <button onClick={() => del(u)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit User' : 'Add User'}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Full Name *</label><input required value={form.name} onChange={f('name')} className="input" /></div>
          <div><label className="label">Email *</label><input required type="email" value={form.email} onChange={f('email')} className="input" /></div>
          <div><label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label><input type="password" required={!editing} value={form.password} onChange={f('password')} className="input" placeholder={editing ? 'Leave blank to keep current' : ''} /></div>
          <div><label className="label">Role</label>
            <select value={form.role} onChange={f('role')} className="input">
              {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div><label className="label">Phone</label><input value={form.phone || ''} onChange={f('phone')} className="input" /></div>
          {me?.role === 'super_admin' && !editing && (
            <div><label className="label">Branch</label>
              <select value={form.branch_id} onChange={f('branch_id')} className="input">
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          {editing && <div className="flex items-center gap-2"><input type="checkbox" id="ua" checked={!!form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} /><label htmlFor="ua" className="text-sm">Active</label></div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
