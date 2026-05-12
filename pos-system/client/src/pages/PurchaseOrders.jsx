import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Eye, CheckCircle, XCircle } from 'lucide-react'

const STATUS_BADGE = { pending: 'bg-amber-100 text-amber-700', received: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }

export default function PurchaseOrders() {
  const [pos, setPos] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [modal, setModal] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({ supplier_id: '', notes: '', items: [] })
  const [loading, setLoading] = useState(false)

  const load = () => { api.getPurchaseOrders().then(setPos); api.getProducts().then(setProducts); api.getSuppliers().then(setSuppliers) }
  useEffect(load, [])

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { product_id: '', name: '', cost: '', quantity: 1 }] }))
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i, k, v) => setForm(p => ({ ...p, items: p.items.map((item, idx) => idx === i ? { ...item, [k]: v, ...(k === 'product_id' && v ? { name: products.find(p => p.id === v)?.name || '', cost: products.find(p => p.id === v)?.cost || '' } : {}) } : item) }))

  const save = async (e) => {
    e.preventDefault()
    if (!form.items.length) { toast.error('Add at least one item'); return }
    setLoading(true)
    try { await api.createPurchaseOrder(form); toast.success('Purchase order created'); setModal(false); setForm({ supplier_id: '', notes: '', items: [] }); load() }
    catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const receive = async (po) => {
    if (!confirm('Mark as received? This will update product stock.')) return
    await api.receivePurchaseOrder(po.id); toast.success('Received'); load()
  }

  const cancel = async (po) => {
    if (!confirm('Cancel this purchase order?')) return
    await api.cancelPurchaseOrder(po.id); toast.success('Cancelled'); load()
  }

  const openDetail = async (po) => { const d = await api.getPurchaseOrder(po.id); setDetail(d) }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1><p className="text-gray-500 text-sm">{pos.length} orders</p></div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} />New PO</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr className="table-head">
            <th className="px-4 py-3 text-left">PO #</th>
            <th className="px-4 py-3 text-left">Supplier</th>
            <th className="px-4 py-3 text-left">Created By</th>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {pos.map(po => (
              <tr key={po.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-blue-600">{po.po_number}</td>
                <td className="px-4 py-3 text-sm">{po.supplier_name || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{po.user_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{fmt.date(po.created_at)}</td>
                <td className="px-4 py-3 text-right font-semibold">{fmt.currency(po.total)}</td>
                <td className="px-4 py-3 text-center"><span className={`badge ${STATUS_BADGE[po.status]}`}>{po.status}</span></td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openDetail(po)} className="text-gray-400 hover:text-blue-600"><Eye size={15} /></button>
                    {po.status === 'pending' && <>
                      <button onClick={() => receive(po)} className="text-gray-400 hover:text-green-600"><CheckCircle size={15} /></button>
                      <button onClick={() => cancel(po)} className="text-gray-400 hover:text-red-600"><XCircle size={15} /></button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pos.length === 0 && <div className="text-center py-12 text-gray-400">No purchase orders yet</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Purchase Order" size="xl">
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Supplier</label>
            <select value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))} className="input">
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><label className="label mb-0">Items</label><button type="button" onClick={addItem} className="btn-secondary text-xs py-1 px-2"><Plus size={12} />Add Item</button></div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
                <div className="col-span-5"><select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} className="input text-sm">
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
                <div className="col-span-2"><input placeholder="Name" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} className="input text-sm" /></div>
                <div className="col-span-2"><input type="number" step="0.01" placeholder="Cost" value={item.cost} onChange={e => updateItem(i, 'cost', e.target.value)} className="input text-sm" /></div>
                <div className="col-span-2"><input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="input text-sm" /></div>
                <div className="col-span-1 text-center"><button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><XCircle size={16} /></button></div>
              </div>
            ))}
            {form.items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No items yet</p>}
          </div>
          <div><label className="label">Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input h-20 resize-none" /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create PO'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`PO — ${detail?.po_number}`} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Supplier</span><p className="font-medium">{detail.supplier_name || '—'}</p></div>
              <div><span className="text-gray-500">Status</span><p><span className={`badge ${STATUS_BADGE[detail.status]}`}>{detail.status}</span></p></div>
              <div><span className="text-gray-500">Date</span><p className="font-medium">{fmt.date(detail.created_at)}</p></div>
              <div><span className="text-gray-500">Total</span><p className="font-bold text-lg">{fmt.currency(detail.total)}</p></div>
            </div>
            <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
              <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-center">Qty</th><th className="px-3 py-2 text-right">Subtotal</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {detail.items?.map((i, idx) => (
                  <tr key={idx}><td className="px-3 py-2">{i.name}</td><td className="px-3 py-2 text-right">{fmt.currency(i.cost)}</td><td className="px-3 py-2 text-center">{i.quantity}</td><td className="px-3 py-2 text-right font-medium">{fmt.currency(i.cost * i.quantity)}</td></tr>
                ))}
              </tbody>
            </table>
            {detail.notes && <p className="text-sm text-gray-500">Notes: {detail.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
