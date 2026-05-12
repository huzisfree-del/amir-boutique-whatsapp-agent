import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const { from, to } = req.query
  let q = 'SELECT e.*, u.name as user_name FROM expenses e LEFT JOIN users u ON e.user_id = u.id WHERE e.branch_id = ?'
  const params = [req.user.branch_id]
  if (from) { q += ' AND e.date >= ?'; params.push(from) }
  if (to) { q += ' AND e.date <= ?'; params.push(to) }
  q += ' ORDER BY e.date DESC'
  res.json(db.prepare(q).all(...params))
})

r.post('/', (req, res) => {
  const { category, description, amount, date } = req.body
  const id = uuid()
  db.prepare('INSERT INTO expenses (id,branch_id,user_id,category,description,amount,date) VALUES (?,?,?,?,?,?,?)').run(id, req.user.branch_id, req.user.id, category, description, amount, date || new Date().toISOString().slice(0, 10))
  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(id))
})

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default r
