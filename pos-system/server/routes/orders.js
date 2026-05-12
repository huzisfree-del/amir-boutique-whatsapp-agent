import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const { from, to, status, cashier_id, page = 1, limit = 50 } = req.query
  let q = `SELECT o.*, u.name as cashier_name, c.name as customer_name
    FROM orders o LEFT JOIN users u ON o.cashier_id = u.id
    LEFT JOIN customers c ON o.customer_id = c.id WHERE 1=1`
  const params = []
  if (req.user.role !== 'super_admin') { q += ' AND o.branch_id = ?'; params.push(req.user.branch_id) }
  if (from) { q += ' AND date(o.created_at) >= ?'; params.push(from) }
  if (to) { q += ' AND date(o.created_at) <= ?'; params.push(to) }
  if (status) { q += ' AND o.status = ?'; params.push(status) }
  if (cashier_id) { q += ' AND o.cashier_id = ?'; params.push(cashier_id) }
  q += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?'
  params.push(Number(limit), (Number(page) - 1) * Number(limit))
  res.json(db.prepare(q).all(...params))
})

r.get('/:id', (req, res) => {
  const order = db.prepare(`SELECT o.*, u.name as cashier_name, c.name as customer_name
    FROM orders o LEFT JOIN users u ON o.cashier_id = u.id
    LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?`).get(req.params.id)
  if (!order) return res.status(404).json({ error: 'Not found' })
  const items = db.prepare('SELECT oi.*, p.sku FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?').all(req.params.id)
  res.json({ ...order, items })
})

r.post('/', (req, res) => {
  const { customer_id, discount_id, items, payment_method, paid_amount, notes, tax_rate } = req.body
  if (!items?.length) return res.status(400).json({ error: 'No items' })

  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.user.branch_id)
  const taxRate = tax_rate ?? branch?.tax_rate ?? 0

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  let discountAmount = 0
  if (discount_id) {
    const disc = db.prepare('SELECT * FROM discounts WHERE id = ? AND is_active = 1').get(discount_id)
    if (disc) {
      discountAmount = disc.type === 'percentage' ? subtotal * (disc.value / 100) : disc.value
      db.prepare('UPDATE discounts SET uses = uses + 1 WHERE id = ?').run(discount_id)
    }
  }
  const taxable = subtotal - discountAmount
  const taxAmount = taxable * (taxRate / 100)
  const total = taxable + taxAmount
  const changeAmount = Math.max(0, (paid_amount || total) - total)

  const id = uuid()
  const orderNum = 'ORD-' + Date.now().toString().slice(-6)

  db.prepare(`INSERT INTO orders (id,branch_id,customer_id,cashier_id,discount_id,order_number,subtotal,discount_amount,tax_amount,total,paid_amount,change_amount,payment_method,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, req.user.branch_id, customer_id || null, req.user.id, discount_id || null,
    orderNum, subtotal, discountAmount, taxAmount, total, paid_amount || total, changeAmount, payment_method || 'cash', notes
  )

  const itemStmt = db.prepare('INSERT INTO order_items (id,order_id,product_id,name,price,quantity,subtotal) VALUES (?,?,?,?,?,?,?)')
  const stockStmt = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?')
  for (const item of items) {
    itemStmt.run(uuid(), id, item.product_id, item.name, item.price, item.quantity, item.price * item.quantity)
    if (item.product_id) stockStmt.run(item.quantity, item.product_id)
  }

  // Update customer loyalty & spending
  if (customer_id) {
    const pts = Math.floor(total)
    db.prepare('UPDATE customers SET loyalty_points = loyalty_points + ?, total_spent = total_spent + ? WHERE id = ?').run(pts, total, customer_id)
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id)
  res.json({ ...order, items: orderItems })
})

r.patch('/:id/refund', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!order) return res.status(404).json({ error: 'Not found' })
  if (order.status === 'refunded') return res.status(400).json({ error: 'Already refunded' })
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('refunded', req.params.id)
  // Restore stock
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id)
  items.forEach(i => { if (i.product_id) db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(i.quantity, i.product_id) })
  if (order.customer_id) {
    const pts = Math.floor(order.total)
    db.prepare('UPDATE customers SET loyalty_points = MAX(0, loyalty_points - ?), total_spent = MAX(0, total_spent - ?) WHERE id = ?').run(pts, order.total, order.customer_id)
  }
  res.json({ ok: true })
})

export default r
