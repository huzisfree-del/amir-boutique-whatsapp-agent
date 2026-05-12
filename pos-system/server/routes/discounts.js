import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const discounts = db.prepare('SELECT * FROM discounts WHERE branch_id = ? ORDER BY created_at DESC').all(req.user.branch_id)
  res.json(discounts)
})

r.post('/validate', (req, res) => {
  const { code, subtotal } = req.body
  const disc = db.prepare('SELECT * FROM discounts WHERE code = ? AND is_active = 1 AND branch_id = ?').get(code, req.user.branch_id)
  if (!disc) return res.status(404).json({ error: 'Invalid coupon code' })
  if (disc.expires_at && new Date(disc.expires_at) < new Date()) return res.status(400).json({ error: 'Coupon expired' })
  if (disc.max_uses && disc.uses >= disc.max_uses) return res.status(400).json({ error: 'Coupon usage limit reached' })
  if (subtotal < disc.min_order) return res.status(400).json({ error: `Minimum order is ${disc.min_order}` })
  const amount = disc.type === 'percentage' ? subtotal * (disc.value / 100) : disc.value
  res.json({ discount: disc, amount })
})

r.post('/', (req, res) => {
  const { name, code, type, value, min_order, max_uses, starts_at, expires_at } = req.body
  const id = uuid()
  db.prepare('INSERT INTO discounts (id,branch_id,name,code,type,value,min_order,max_uses,starts_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, req.user.branch_id, name, code, type, value, min_order || 0, max_uses || null, starts_at || null, expires_at || null)
  res.json(db.prepare('SELECT * FROM discounts WHERE id = ?').get(id))
})

r.put('/:id', (req, res) => {
  const { name, code, type, value, min_order, max_uses, starts_at, expires_at, is_active } = req.body
  db.prepare('UPDATE discounts SET name=?,code=?,type=?,value=?,min_order=?,max_uses=?,starts_at=?,expires_at=?,is_active=? WHERE id=?').run(name, code, type, value, min_order, max_uses, starts_at, expires_at, is_active ? 1 : 0, req.params.id)
  res.json(db.prepare('SELECT * FROM discounts WHERE id = ?').get(req.params.id))
})

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM discounts WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default r
