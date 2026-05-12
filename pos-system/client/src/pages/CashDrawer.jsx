import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { DollarSign, Lock, Unlock } from 'lucide-react'

export default function CashDrawer() {
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [openingCash, setOpeningCash] = useState('')
  const [closingCash, setClosingCash] = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => { api.getCurrentDrawer().then(setCurrent); api.getDrawers().then(setHistory) }
  useEffect(load, [])

  const openDrawer = async (e) => {
    e.preventDefault(); setLoading(true)
    try { await api.openDrawer({ opening_cash: Number(openingCash) }); toast.success('Drawer opened'); setOpenModal(false); setOpeningCash(''); load() }
    catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const closeDrawer = async (e) => {
    e.preventDefault(); setLoading(true)
    try { const result = await api.closeDrawer({ closing_cash: Number(closingCash) }); toast.success('Drawer closed'); setCloseModal(false); setClosingCash(''); load() }
    catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Cash Drawer</h1><p className="text-gray-500 text-sm">Manage your daily cash drawer</p></div>
        {current
          ? <button onClick={() => setCloseModal(true)} className="btn-danger"><Lock size={16} />Close Drawer</button>
          : <button onClick={() => setOpenModal(true)} className="btn-success"><Unlock size={16} />Open Drawer</button>
        }
      </div>

      {current ? (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl"><DollarSign size={24} /></div>
            <div><h2 className="font-bold text-gray-800 text-lg">Drawer Open</h2><p className="text-sm text-gray-500">Opened at {fmt.datetime(current.opened_at)}</p></div>
            <span className="ml-auto badge bg-green-100 text-green-700">● Open</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Opening Cash</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{fmt.currency(current.opening_cash)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Cash Sales</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{fmt.currency(current.sales_total)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center mb-6">
          <Lock size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No drawer open. Open a drawer to start selling.</p>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-700">Drawer History</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-head">
              <th className="px-4 py-3 text-left">Cashier</th>
              <th className="px-4 py-3 text-left">Opened</th>
              <th className="px-4 py-3 text-left">Closed</th>
              <th className="px-4 py-3 text-right">Opening</th>
              <th className="px-4 py-3 text-right">Cash Sales</th>
              <th className="px-4 py-3 text-right">Closing</th>
              <th className="px-4 py-3 text-right">Difference</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {history.map(d => {
                const diff = d.closing_cash != null ? (d.closing_cash - d.opening_cash - d.sales_total) : null
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{d.cashier_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmt.datetime(d.opened_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{d.closed_at ? fmt.datetime(d.closed_at) : '—'}</td>
                    <td className="px-4 py-3 text-right text-sm">{fmt.currency(d.opening_cash)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{fmt.currency(d.sales_total)}</td>
                    <td className="px-4 py-3 text-right text-sm">{d.closing_cash != null ? fmt.currency(d.closing_cash) : '—'}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {diff != null ? <span className={diff < -1 ? 'text-red-600' : diff > 1 ? 'text-green-600' : 'text-gray-600'}>{diff >= 0 ? '+' : ''}{fmt.currency(diff)}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-center"><span className={`badge ${d.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {history.length === 0 && <div className="text-center py-8 text-gray-400">No drawer history</div>}
        </div>
      </div>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Open Cash Drawer" size="sm">
        <form onSubmit={openDrawer} className="space-y-4">
          <div><label className="label">Opening Cash Amount</label><input type="number" step="0.01" value={openingCash} onChange={e => setOpeningCash(e.target.value)} className="input" placeholder="0.00" /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setOpenModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-success">{loading ? 'Opening...' : 'Open Drawer'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Close Cash Drawer" size="sm">
        <form onSubmit={closeDrawer} className="space-y-4">
          {current && <div className="p-3 bg-gray-50 rounded-xl text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Opening Cash</span><span>{fmt.currency(current.opening_cash)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Expected (opening + cash sales)</span><span className="font-medium">{fmt.currency(current.opening_cash + (current.sales_total || 0))}</span></div>
          </div>}
          <div><label className="label">Actual Closing Cash</label><input required type="number" step="0.01" value={closingCash} onChange={e => setClosingCash(e.target.value)} className="input" placeholder="0.00" /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCloseModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-danger">{loading ? 'Closing...' : 'Close Drawer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
