import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { signToken, verifyToken } from '../auth.js'

const r = Router()

r.post('/login', (req, res) => {
  const { email, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email)
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' })
  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(user.branch_id)
  const { password: _, ...safe } = user
  res.json({ token: signToken({ id: user.id, role: user.role, branch_id: user.branch_id }), user: safe, branch })
})

r.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,phone,branch_id,is_active,created_at FROM users WHERE id = ?').get(req.user.id)
  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(user.branch_id)
  res.json({ user, branch })
})

r.put('/me/password', verifyToken, (req, res) => {
  const { current, next: nextPw } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!bcrypt.compareSync(current, user.password)) return res.status(400).json({ error: 'Wrong current password' })
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(nextPw, 10), req.user.id)
  res.json({ ok: true })
})

export default r
