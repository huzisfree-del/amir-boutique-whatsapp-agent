import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const cats = req.user.role === 'super_admin'
    ? db.prepare('SELECT * FROM categories ORDER BY name').all()
    : db.prepare('SELECT * FROM categories WHERE branch_id = ? ORDER BY name').all(req.user.branch_id)
  res.json(cats)
})

r.post('/', (req, res) => {
  const { name, description, color } = req.body
  const id = uuid()
  db.prepare('INSERT INTO categories (id,branch_id,name,description,color) VALUES (?,?,?,?,?)').run(id, req.user.branch_id, name, description, color || '#3b82f6')
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id))
})

r.put('/:id', (req, res) => {
  const { name, description, color } = req.body
  db.prepare('UPDATE categories SET name=?,description=?,color=? WHERE id=?').run(name, description, color, req.params.id)
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id))
})

r.delete('/:id', (req, res) => {
  const inUse = db.prepare('SELECT id FROM products WHERE category_id = ? LIMIT 1').get(req.params.id)
  if (inUse) return res.status(400).json({ error: 'Category has products' })
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default r
