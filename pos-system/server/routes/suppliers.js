import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const suppliers = req.user.role === 'super_admin'
    ? db.prepare('SELECT * FROM suppliers ORDER BY name').all()
    : db.prepare('SELECT * FROM suppliers WHERE branch_id = ? ORDER BY name').all(req.user.branch_id)
  res.json(suppliers)
})

r.post('/', (req, res) => {
  const { name, contact_person, email, phone, address } = req.body
  const id = uuid()
  db.prepare('INSERT INTO suppliers (id,branch_id,name,contact_person,email,phone,address) VALUES (?,?,?,?,?,?,?)').run(id, req.user.branch_id, name, contact_person, email, phone, address)
  res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id))
})

r.put('/:id', (req, res) => {
  const { name, contact_person, email, phone, address, is_active } = req.body
  db.prepare('UPDATE suppliers SET name=?,contact_person=?,email=?,phone=?,address=?,is_active=? WHERE id=?').run(name, contact_person, email, phone, address, is_active ? 1 : 0, req.params.id)
  res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id))
})

r.delete('/:id', (req, res) => {
  db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default r
