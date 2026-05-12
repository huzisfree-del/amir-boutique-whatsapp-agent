import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/current', (req, res) => {
  const drawer = db.prepare(`SELECT cd.*, u.name as cashier_name FROM cash_drawers cd
    LEFT JOIN users u ON cd.cashier_id = u.id
    WHERE cd.branch_id = ? AND cd.cashier_id = ? AND cd.status = 'open'
    ORDER BY cd.opened_at DESC LIMIT 1`).get(req.user.branch_id, req.user.id)
  res.json(drawer || null)
})

r.get('/', (req, res) => {
  const drawers = db.prepare(`SELECT cd.*, u.name as cashier_name FROM cash_drawers cd
    LEFT JOIN users u ON cd.cashier_id = u.id
    WHERE cd.branch_id = ? ORDER BY cd.opened_at DESC LIMIT 30`).all(req.user.branch_id)
  res.json(drawers)
})

r.post('/open', (req, res) => {
  const { opening_cash } = req.body
  const existing = db.prepare("SELECT id FROM cash_drawers WHERE branch_id=? AND cashier_id=? AND status='open'").get(req.user.branch_id, req.user.id)
  if (existing) return res.status(400).json({ error: 'A drawer is already open' })
  const id = uuid()
  db.prepare('INSERT INTO cash_drawers (id,branch_id,cashier_id,opening_cash) VALUES (?,?,?,?)').run(id, req.user.branch_id, req.user.id, opening_cash || 0)
  res.json(db.prepare('SELECT * FROM cash_drawers WHERE id = ?').get(id))
})

r.post('/close', (req, res) => {
  const { closing_cash } = req.body
  const drawer = db.prepare("SELECT * FROM cash_drawers WHERE branch_id=? AND cashier_id=? AND status='open'").get(req.user.branch_id, req.user.id)
  if (!drawer) return res.status(404).json({ error: 'No open drawer' })
  const salesTotal = db.prepare(`SELECT COALESCE(SUM(total),0) as t FROM orders WHERE branch_id=? AND cashier_id=? AND payment_method='cash' AND date(created_at)=date(?) AND status='completed'`).get(req.user.branch_id, req.user.id, drawer.opened_at).t
  db.prepare("UPDATE cash_drawers SET status='closed', closing_cash=?, sales_total=?, closed_at=datetime('now') WHERE id=?").run(closing_cash, salesTotal, drawer.id)
  res.json(db.prepare('SELECT * FROM cash_drawers WHERE id = ?').get(drawer.id))
})

export default r
