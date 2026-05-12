import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../store/auth'
import toast from 'react-hot-toast'
import { Save, Lock } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR', 'INR', 'CAD', 'AUD']

export default function Settings() {
  const { setBranch } = useAuth()
  const [form, setForm] = useState(null)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => { api.getSettings().then(setForm) }, [])

  const save = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const updated = await api.updateSettings(form)
      setBranch(updated)
      toast.success('Settings saved')
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const changePw = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    if (pwForm.next.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setPwLoading(true)
    try { await api.changePassword({ current: pwForm.current, next: pwForm.next }); toast.success('Password changed'); setPwForm({ current: '', next: '', confirm: '' }) }
    catch (err) { toast.error(err.message) }
    finally { setPwLoading(false) }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  if (!form) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Store Information</h2>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Store Name</label><input value={form.name || ''} onChange={f('name')} className="input" /></div>
          <div><label className="label">Address</label><input value={form.address || ''} onChange={f('address')} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input value={form.phone || ''} onChange={f('phone')} className="input" /></div>
            <div><label className="label">Email</label><input type="email" value={form.email || ''} onChange={f('email')} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Currency</label>
              <select value={form.currency} onChange={f('currency')} className="input">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Tax Rate (%)</label><input type="number" step="0.01" value={form.tax_rate || 0} onChange={f('tax_rate')} className="input" /></div>
          </div>
          <div><label className="label">Receipt Footer Message</label><textarea value={form.receipt_footer || ''} onChange={f('receipt_footer')} className="input h-20 resize-none" /></div>
          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="btn-primary"><Save size={16} />{loading ? 'Saving...' : 'Save Settings'}</button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Lock size={16} />Change Password</h2>
        <form onSubmit={changePw} className="space-y-4">
          <div><label className="label">Current Password</label><input required type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} className="input" /></div>
          <div><label className="label">New Password</label><input required type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} className="input" /></div>
          <div><label className="label">Confirm New Password</label><input required type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} className="input" /></div>
          <div className="flex justify-end">
            <button type="submit" disabled={pwLoading} className="btn-primary">{pwLoading ? 'Updating...' : 'Update Password'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
