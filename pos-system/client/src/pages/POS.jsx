import { useEffect, useState, useRef } from 'react'
import { api } from '../api'
import { fmt } from '../utils/format'
import { useAuth } from '../store/auth'
import toast from 'react-hot-toast'
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Tag, Printer, X, CheckCircle } from 'lucide-react'

const PAYMENT_METHODS = ['cash', 'card', 'split']

export default function POS() {
  const { user, branch } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [customers, setCustomers] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [customer, setCustomer] = useState(null)
  const [discount, setDiscount] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const searchRef = useRef()
  const currency = branch?.currency || 'USD'

  useEffect(() => {
    Promise.all([api.getProducts(), api.getCategories(), api.getCustomers()]).then(([p, c, cu]) => {
      setProducts(p.filter(x => x.is_active))
      setCategories(c)
      setCustomers(cu)
    })
    searchRef.current?.focus()
  }, [])

  const filtered = products.filter(p => {
    const matchCat = activeCat === 'all' || p.category_id === activeCat
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)
    return matchCat && matchSearch
  })

  const addToCart = (product) => {
    if (product.stock <= 0) { toast.error('Out of stock'); return }
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error('Not enough stock'); return prev }
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock }]
    })
  }

  const updateQty = (id, qty) => {
    if (qty <= 0) { removeItem(id); return }
    setCart(prev => prev.map(i => {
      if (i.product_id !== id) return i
      if (qty > i.stock) { toast.error('Not enough stock'); return i }
      return { ...i, quantity: qty }
    }))
  }

  const removeItem = (id) => setCart(prev => prev.filter(i => i.product_id !== id))

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const discountAmount = discount ? (discount.type === 'percentage' ? subtotal * (discount.value / 100) : discount.value) : 0
  const taxRate = branch?.tax_rate || 0
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100)
  const total = subtotal - discountAmount + taxAmount
  const change = paymentMethod === 'cash' && paidAmount ? Math.max(0, Number(paidAmount) - total) : 0

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    try {
      const { discount: d } = await api.validateDiscount({ code: couponCode, subtotal })
      setDiscount(d)
      toast.success(`Coupon applied: ${d.name}`)
    } catch (err) { toast.error(err.message) }
  }

  const checkout = async () => {
    if (!cart.length) { toast.error('Cart is empty'); return }
    if (paymentMethod === 'cash' && paidAmount && Number(paidAmount) < total) { toast.error('Insufficient payment'); return }
    setLoading(true)
    try {
      const order = await api.createOrder({
        customer_id: customer?.id || null,
        discount_id: discount?.id || null,
        items: cart,
        payment_method: paymentMethod,
        paid_amount: paymentMethod === 'cash' ? (paidAmount ? Number(paidAmount) : total) : total,
        notes: note,
      })
      setReceipt(order)
      setCart([])
      setDiscount(null)
      setCouponCode('')
      setCustomer(null)
      setNote('')
      setPaidAmount('')
      toast.success('Order completed!')
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  if (receipt) return <Receipt receipt={receipt} branch={branch} currency={currency} onNew={() => setReceipt(null)} />

  return (
    <div className="flex h-[calc(100vh-0px)] lg:h-screen overflow-hidden bg-gray-100">
      {/* Left — Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Search & Categories */}
        <div className="bg-white border-b border-gray-200 p-3 space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search product, SKU, or scan barcode..."
              className="input pl-9 text-sm" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setActiveCat('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${activeCat === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCat(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${activeCat === c.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={activeCat === c.id ? { backgroundColor: c.color } : {}}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <Package size={40} className="mx-auto mb-2 opacity-40" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {filtered.map(p => (
                <button key={p.id} onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className={`bg-white rounded-xl p-3 text-left border transition-all hover:shadow-md hover:border-blue-300 active:scale-95 ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'border-gray-200'}`}>
                  <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-3xl">
                    {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover rounded-lg" /> : '📦'}
                  </div>
                  <p className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.sku}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-blue-600 font-bold text-sm">{fmt.currency(p.price, currency)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.stock <= p.low_stock_alert ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                      {p.stock} {p.unit}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — Cart */}
      <div className="w-80 xl:w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
        {/* Cart header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><ShoppingCart size={18} /> Cart ({cart.length})</h2>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>}
          </div>
          {/* Customer picker */}
          <div className="relative">
            <button onClick={() => setShowCustomerPicker(v => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:border-blue-300 transition-colors">
              <User size={15} className="text-gray-400" />
              <span className={customer ? 'text-gray-800' : 'text-gray-400'}>{customer ? customer.name : 'Select customer (optional)'}</span>
              {customer && <button onClick={e => { e.stopPropagation(); setCustomer(null) }} className="ml-auto text-gray-400 hover:text-red-500"><X size={14} /></button>}
            </button>
            {showCustomerPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search customer..." className="w-full px-3 py-2 text-sm border-b border-gray-100 focus:outline-none" autoFocus />
                <div className="max-h-40 overflow-y-auto">
                  {customers.filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                    <button key={c.id} onClick={() => { setCustomer(c); setShowCustomerPicker(false); setCustomerSearch('') }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-blue-50 flex items-center justify-between">
                      <span>{c.name}</span>
                      <span className="text-xs text-amber-600">{c.loyalty_points} pts</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-300 mt-12">
              <ShoppingCart size={40} className="mx-auto mb-2" />
              <p className="text-sm">Add products to start</p>
            </div>
          ) : cart.map(item => (
            <div key={item.product_id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-blue-600 font-semibold">{fmt.currency(item.price, currency)}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => updateQty(item.product_id, item.quantity - 1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition"><Minus size={12} /></button>
                <input type="number" value={item.quantity} min={1} max={item.stock}
                  onChange={e => updateQty(item.product_id, Number(e.target.value))}
                  className="w-10 text-center text-sm font-medium border border-gray-200 rounded-lg focus:outline-none" />
                <button onClick={() => updateQty(item.product_id, item.quantity + 1)} className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition"><Plus size={12} /></button>
              </div>
              <div className="text-right flex-shrink-0 w-16">
                <p className="text-sm font-bold text-gray-800">{fmt.currency(item.price * item.quantity, currency)}</p>
                <button onClick={() => removeItem(item.product_id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals + Payment */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          {/* Coupon */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Coupon code" className="input pl-8 text-sm" />
            </div>
            <button onClick={validateCoupon} className="btn-secondary text-xs">Apply</button>
            {discount && <button onClick={() => { setDiscount(null); setCouponCode('') }} className="text-red-400 hover:text-red-600"><X size={16} /></button>}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt.currency(subtotal, currency)}</span></div>
            {discount && <div className="flex justify-between text-green-600"><span>Discount ({discount.name})</span><span>-{fmt.currency(discountAmount, currency)}</span></div>}
            {taxRate > 0 && <div className="flex justify-between text-gray-600"><span>Tax ({taxRate}%)</span><span>{fmt.currency(taxAmount, currency)}</span></div>}
            <div className="flex justify-between font-bold text-base text-gray-900 pt-1.5 border-t border-gray-100">
              <span>Total</span><span className="text-blue-600">{fmt.currency(total, currency)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="flex gap-1.5">
            {PAYMENT_METHODS.map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${paymentMethod === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{m}</button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <div>
              <label className="label text-xs">Amount Paid</label>
              <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                placeholder={fmt.currency(total, currency)} className="input text-sm" />
              {paidAmount && Number(paidAmount) >= total && (
                <p className="text-xs text-green-600 mt-1">Change: {fmt.currency(change, currency)}</p>
              )}
            </div>
          )}

          <div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Order note (optional)" className="input text-sm" />
          </div>

          <button onClick={checkout} disabled={loading || !cart.length} className="btn-success w-full justify-center py-3 text-base">
            {loading ? 'Processing...' : `Charge ${fmt.currency(total, currency)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function Receipt({ receipt, branch, currency, onNew }) {
  const printRef = useRef()

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;font-size:12px;width:280px;margin:0 auto;padding:16px}h2,p{margin:4px 0}.divider{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between}.bold{font-weight:bold}.center{text-align:center}</style></head><body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="flex items-center justify-center h-full bg-gray-100 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <div className="text-center mb-4">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-gray-800">Order Complete!</h2>
        </div>

        <div ref={printRef} className="font-mono text-sm border border-gray-200 rounded-xl p-4 space-y-1">
          <p className="text-center font-bold text-base">{branch?.name}</p>
          {branch?.address && <p className="text-center text-xs text-gray-500">{branch.address}</p>}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="flex justify-between"><span>Order:</span><span>{receipt.order_number}</span></div>
          <div className="flex justify-between text-xs text-gray-500"><span>{fmt.datetime(receipt.created_at)}</span></div>
          <div className="border-t border-dashed border-gray-300 my-2" />
          {receipt.items?.map((item, i) => (
            <div key={i}>
              <p className="font-medium">{item.name}</p>
              <div className="flex justify-between text-xs text-gray-500 pl-2">
                <span>{item.quantity} x {fmt.currency(item.price, currency)}</span>
                <span>{fmt.currency(item.subtotal, currency)}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="flex justify-between"><span>Subtotal</span><span>{fmt.currency(receipt.subtotal, currency)}</span></div>
          {receipt.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{fmt.currency(receipt.discount_amount, currency)}</span></div>}
          {receipt.tax_amount > 0 && <div className="flex justify-between"><span>Tax</span><span>{fmt.currency(receipt.tax_amount, currency)}</span></div>}
          <div className="flex justify-between font-bold text-base"><span>TOTAL</span><span>{fmt.currency(receipt.total, currency)}</span></div>
          <div className="flex justify-between text-xs text-gray-500"><span>Paid ({receipt.payment_method})</span><span>{fmt.currency(receipt.paid_amount, currency)}</span></div>
          {receipt.change_amount > 0 && <div className="flex justify-between text-xs"><span>Change</span><span>{fmt.currency(receipt.change_amount, currency)}</span></div>}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <p className="text-center text-xs text-gray-500">{branch?.receipt_footer}</p>
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={handlePrint} className="btn-secondary flex-1 justify-center gap-2"><Printer size={16} />Print</button>
          <button onClick={onNew} className="btn-primary flex-1 justify-center">New Order</button>
        </div>
      </div>
    </div>
  )
}
