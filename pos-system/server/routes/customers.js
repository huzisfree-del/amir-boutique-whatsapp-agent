import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const { search } = req.query
  let q = 'SELECT * FROM customers WHERE 1=1'
  const params = []
  if (req.user.role !== 'super_admin') { q += ' AND branch_id = ?'; params.push(req.user.branch_id) }
  if (search) { q += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  q += ' ORDER BY name'
  res.json(db.prepare(q).all(...params))
})

r.get('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!c) return res.status(404).json({ error: 'Not found' })
  const orders = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id)
  res.json({ ...c, orders })
})

r.post('/', (req, res) => {
  const { name, email, phone, address, notes } = req.body
  const id = uuid()
  db.prepare('INSERT INTO customers (id,branch_id,name,email,phone,address,notes) VALUES (?,?,?,?,?,?,?)').run(id, req.user.branch_id, name, email, phone, address, notes)
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(id))
})

r.put('/:id', (req, res) => {
  const { name, email, phone, address, notes, loyalty_points } = req.body
  db.prepare('UPDATE customers SET name=?,email=?,phone=?,address=?,notes=?,loyalty_points=? WHERE id=?').run(name, email, phone, address, notes, loyalty_points, req.params.id)
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id))
})

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default r
