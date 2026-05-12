import { Router } from 'express'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

r.get('/', (req, res) => {
  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.user.branch_id)
  res.json(branch)
})

r.put('/', (req, res) => {
  const { name, address, phone, email, currency, tax_rate, receipt_footer } = req.body
  db.prepare('UPDATE branches SET name=?,address=?,phone=?,email=?,currency=?,tax_rate=?,receipt_footer=? WHERE id=?')
    .run(name, address, phone, email, currency, tax_rate, receipt_footer, req.user.branch_id)
  res.json(db.prepare('SELECT * FROM branches WHERE id = ?').get(req.user.branch_id))
})

export default r
