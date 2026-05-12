import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken, requireRole } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin'
  const users = isSuperAdmin
    ? db.prepare('SELECT id,name,email,role,phone,branch_id,is_active,created_at FROM users ORDER BY created_at DESC').all()
    : db.prepare('SELECT id,name,email,role,phone,branch_id,is_active,created_at FROM users WHERE branch_id = ? ORDER BY created_at DESC').all(req.user.branch_id)
  res.json(users)
})

r.get('/:id', (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,phone,branch_id,is_active,created_at FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

r.post('/', requireRole('super_admin', 'admin', 'manager'), (req, res) => {
  const { name, email, password, role, phone, branch_id } = req.body
  const targetBranch = req.user.role === 'super_admin' ? branch_id : req.user.branch_id
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return res.status(400).json({ error: 'Email already exists' })
  // Prevent privilege escalation
  if (req.user.role === 'admin' && ['super_admin', 'admin'].includes(role))
    return res.status(403).json({ error: 'Cannot assign this role' })
  const id = uuid()
  db.prepare('INSERT INTO users (id,branch_id,name,email,password,role,phone) VALUES (?,?,?,?,?,?,?)')
    .run(id, targetBranch, name, email, bcrypt.hashSync(password, 10), role, phone)
  res.json(db.prepare('SELECT id,name,email,role,phone,branch_id,is_active,created_at FROM users WHERE id = ?').get(id))
})

r.put('/:id', requireRole('super_admin', 'admin', 'manager'), (req, res) => {
  const { name, email, role, phone, is_active, password } = req.body
  if (password) {
    db.prepare('UPDATE users SET name=?,email=?,role=?,phone=?,is_active=?,password=? WHERE id=?')
      .run(name, email, role, phone, is_active ? 1 : 0, bcrypt.hashSync(password, 10), req.params.id)
  } else {
    db.prepare('UPDATE users SET name=?,email=?,role=?,phone=?,is_active=? WHERE id=?')
      .run(name, email, role, phone, is_active ? 1 : 0, req.params.id)
  }
  res.json(db.prepare('SELECT id,name,email,role,phone,branch_id,is_active,created_at FROM users WHERE id = ?').get(req.params.id))
})

r.delete('/:id', requireRole('super_admin', 'admin'), (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' })
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default r
