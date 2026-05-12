import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, AlertTriangle, Package } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

const BLANK = { name: '', sku: '', barcode: '', description: '', price: '', cost: '', stock: '', low_stock_alert: 5, unit: 'pcs', category_id: '', supplier_id: '', is_active: true }

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [stockModal, setStockModal] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()

  const load = () => {
    const params = {}
    if (search) params.search = search
    if (catFilter) params.category_id = catFilter
    if (searchParams.get('low_stock')) params.low_stock = '1'
    api.getProducts(params).then(setProducts)
    api.getCategories().then(setCategories)
    api.getSuppliers().then(setSuppliers)
  }
  useEffect(load, [search, catFilter, searchParams.get('low_stock')])

  const openNew = () => { setEditing(null); setForm(BLANK); setModal(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...p, is_active: !!p.is_active }); setModal(true) }

  const save = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) await api.updateProduct(editing.id, form)
      else await api.createProduct(form)
      toast.success(editing ? 'Product updated' : 'Product created')
      setModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const del = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return
    await api.deleteProduct(p.id); toast.success('Deleted'); load()
  }

  const adjustStock = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    await api.adjustStock(stockModal.id, { adjustment: Number(fd.get('amount')), type: fd.get('type') })
    toast.success('Stock updated'); setStockModal(null); load()
  }

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Products</h1><p className="text-gray-500 text-sm">{products.length} products</p></div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} />Add Product</button>
      </div>

      <div className="card mb-4">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SKU, barcode..." className="input pl-9" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input sm:w-48">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-head">
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-medium text-gray-800">{p.name}</p><p className="text-xs text-gray-400">{p.unit}</p></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.sku || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.category_name || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt.currency(p.price)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">{fmt.currency(p.cost)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setStockModal(p)} className={`badge cursor-pointer hover:opacity-80 ${p.stock <= p.low_stock_alert ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {p.stock <= p.low_stock_alert && <AlertTriangle size={11} className="mr-1" />}
                      {p.stock} {p.unit}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center"><span className={`badge ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-600"><Edit2 size={15} /></button>
                      <button onClick={() => del(p)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <div className="text-center py-12 text-gray-400"><Package size={40} className="mx-auto mb-2 opacity-40" /><p>No products found</p></div>}
        </div>
      </div>

      {/* Product Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={save} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Name *</label><input required value={form.name} onChange={f('name')} className="input" /></div>
          <div><label className="label">SKU</label><input value={form.sku || ''} onChange={f('sku')} className="input" /></div>
          <div><label className="label">Barcode</label><input value={form.barcode || ''} onChange={f('barcode')} className="input" /></div>
          <div><label className="label">Price *</label><input required type="number" step="0.01" value={form.price} onChange={f('price')} className="input" /></div>
          <div><label className="label">Cost</label><input type="number" step="0.01" value={form.cost || ''} onChange={f('cost')} className="input" /></div>
          <div><label className="label">Stock</label><input type="number" value={form.stock || ''} onChange={f('stock')} className="input" /></div>
          <div><label className="label">Low Stock Alert</label><input type="number" value={form.low_stock_alert} onChange={f('low_stock_alert')} className="input" /></div>
          <div><label className="label">Unit</label><input value={form.unit} onChange={f('unit')} className="input" placeholder="pcs, kg, box..." /></div>
          <div><label className="label">Category</label>
            <select value={form.category_id || ''} onChange={f('category_id')} className="input">
              <option value="">No Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Supplier</label>
            <select value={form.supplier_id || ''} onChange={f('supplier_id')} className="input">
              <option value="">No Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label">Description</label><textarea value={form.description || ''} onChange={f('description')} className="input h-20 resize-none" /></div>
          {editing && <div className="col-span-2 flex items-center gap-2"><input type="checkbox" id="active" checked={!!form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} /><label htmlFor="active" className="text-sm text-gray-700">Active</label></div>}
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjust Modal */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`Adjust Stock — ${stockModal?.name}`} size="sm">
        <form onSubmit={adjustStock} className="space-y-4">
          <div><label className="label">Adjustment Type</label>
            <select name="type" className="input">
              <option value="add">Add Stock</option>
              <option value="subtract">Subtract Stock</option>
              <option value="set">Set Exact Amount</option>
            </select>
          </div>
          <div><label className="label">Amount</label><input name="amount" type="number" min="0" required className="input" placeholder="0" /></div>
          <p className="text-sm text-gray-500">Current stock: <strong>{stockModal?.stock} {stockModal?.unit}</strong></p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setStockModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Update Stock</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
