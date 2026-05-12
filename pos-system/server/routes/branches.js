import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken, requireRole } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const branches = db.prepare('SELECT * FROM branches ORDER BY created_at DESC').all()
  res.json(branches)
})

r.get('/:id', (req, res) => {
  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id)
  if (!branch) return res.status(404).json({ error: 'Not found' })
  res.json(branch)
})

r.post('/', requireRole('super_admin'), (req, res) => {
  const { name, address, phone, email, currency, tax_rate, receipt_footer } = req.body
  const id = uuid()
  db.prepare(`INSERT INTO branches (id,name,address,phone,email,currency,tax_rate,receipt_footer)
    VALUES (?,?,?,?,?,?,?,?)`).run(id, name, address, phone, email, currency || 'USD', tax_rate || 0, receipt_footer || 'Thank you!')
  res.json(db.prepare('SELECT * FROM branches WHERE id = ?').get(id))
})

r.put('/:id', requireRole('super_admin', 'admin'), (req, res) => {
  const { name, address, phone, email, currency, tax_rate, receipt_footer, is_active } = req.body
  db.prepare(`UPDATE branches SET name=?,address=?,phone=?,email=?,currency=?,tax_rate=?,receipt_footer=?,is_active=? WHERE id=?`)
    .run(name, address, phone, email, currency, tax_rate, receipt_footer, is_active ? 1 : 0, req.params.id)
  res.json(db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id))
})

r.delete('/:id', requireRole('super_admin'), (req, res) => {
  db.prepare('UPDATE branches SET is_active = 0 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default r
