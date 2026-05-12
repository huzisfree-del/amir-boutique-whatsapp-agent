import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const pos = db.prepare(`SELECT po.*, s.name as supplier_name, u.name as user_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.user_id = u.id
    WHERE po.branch_id = ? ORDER BY po.created_at DESC`).all(req.user.branch_id)
  res.json(pos)
})

r.get('/:id', (req, res) => {
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id)
  if (!po) return res.status(404).json({ error: 'Not found' })
  const items = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(req.params.id)
  res.json({ ...po, items })
})

r.post('/', (req, res) => {
  const { supplier_id, items, notes } = req.body
  const id = uuid()
  const poNumber = 'PO-' + Date.now().toString().slice(-6)
  const total = items.reduce((s, i) => s + i.cost * i.quantity, 0)
  db.prepare('INSERT INTO purchase_orders (id,branch_id,supplier_id,user_id,po_number,total,notes) VALUES (?,?,?,?,?,?,?)').run(id, req.user.branch_id, supplier_id, req.user.id, poNumber, total, notes)
  const stmt = db.prepare('INSERT INTO purchase_order_items (id,po_id,product_id,name,cost,quantity) VALUES (?,?,?,?,?,?)')
  items.forEach(i => stmt.run(uuid(), id, i.product_id, i.name, i.cost, i.quantity))
  res.json(db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id))
})

r.patch('/:id/receive', (req, res) => {
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id)
  if (!po) return res.status(404).json({ error: 'Not found' })
  db.prepare("UPDATE purchase_orders SET status = 'received' WHERE id = ?").run(req.params.id)
  const items = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(req.params.id)
  items.forEach(i => {
    if (i.product_id) db.prepare('UPDATE products SET stock = stock + ?, cost = ? WHERE id = ?').run(i.quantity, i.cost, i.product_id)
    db.prepare('UPDATE purchase_order_items SET received = quantity WHERE id = ?').run(i.id)
  })
  res.json({ ok: true })
})

r.patch('/:id/cancel', (req, res) => {
  db.prepare("UPDATE purchase_orders SET status = 'cancelled' WHERE id = ?").run(req.params.id)
  res.json({ ok: true })
})

export default r
