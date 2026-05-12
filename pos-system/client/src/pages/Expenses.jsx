import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Transport', 'Maintenance', 'Other']
const BLANK = { category: 'Rent', description: '', amount: '', date: new Date().toISOString().slice(0, 10) }

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [filters, setFilters] = useState({ from: '', to: '' })
  const [loading, setLoading] = useState(false)

  const load = () => api.getExpenses(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).then(setExpenses)
  useEffect(load, [filters])

  const save = async (e) => {
    e.preventDefault(); setLoading(true)
    try { await api.createExpense(form); toast.success('Expense added'); setModal(false); setForm(BLANK); load() }
    catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const del = async (e) => {
    if (!confirm('Delete this expense?')) return
    await api.deleteExpense(e.id); toast.success('Deleted'); load()
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Expenses</h1><p className="text-gray-500 text-sm">Total: {fmt.currency(total)}</p></div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} />Add Expense</button>
      </div>

      <div className="card">
        <div className="p-4 flex gap-3 flex-wrap">
          <input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} className="input w-auto" />
          <input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} className="input w-auto" />
          <button onClick={load} className="btn-secondary">Filter</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-head">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Added By</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{fmt.date(e.date)}</td>
                  <td className="px-4 py-3"><span className="badge bg-purple-100 text-purple-700">{e.category}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.user_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt.currency(e.amount)}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => del(e)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && <div className="text-center py-12 text-gray-400">No expenses recorded</div>}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Expense" size="sm">
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Category</label>
            <select value={form.category} onChange={f('category')} className="input">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Amount *</label><input required type="number" step="0.01" value={form.amount} onChange={f('amount')} className="input" /></div>
          <div><label className="label">Date</label><input type="date" value={form.date} onChange={f('date')} className="input" /></div>
          <div><label className="label">Description</label><textarea value={form.description} onChange={f('description')} className="input h-20 resize-none" /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Add Expense'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
