import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

const branchId = (req) => req.user.role === 'super_admin' ? null : req.user.branch_id

r.get('/', (req, res) => {
  const { search, category_id, low_stock } = req.query
  let q = `SELECT p.*, c.name as category_name, s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE 1=1`
  const params = []
  if (branchId(req)) { q += ' AND p.branch_id = ?'; params.push(branchId(req)) }
  if (search) { q += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  if (category_id) { q += ' AND p.category_id = ?'; params.push(category_id) }
  if (low_stock === '1') q += ' AND p.stock <= p.low_stock_alert'
  q += ' ORDER BY p.name'
  res.json(db.prepare(q).all(...params))
})

r.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})

r.post('/', (req, res) => {
  const { name, sku, barcode, description, price, cost, stock, low_stock_alert, unit, category_id, supplier_id, image_url } = req.body
  const id = uuid()
  const bid = req.user.branch_id
  db.prepare(`INSERT INTO products (id,branch_id,category_id,supplier_id,name,sku,barcode,description,price,cost,stock,low_stock_alert,unit,image_url)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, bid, category_id, supplier_id, name, sku, barcode, description, price, cost || 0, stock || 0, low_stock_alert || 5, unit || 'pcs', image_url)
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(id))
})

r.put('/:id', (req, res) => {
  const { name, sku, barcode, description, price, cost, stock, low_stock_alert, unit, category_id, supplier_id, image_url, is_active } = req.body
  db.prepare(`UPDATE products SET name=?,sku=?,barcode=?,description=?,price=?,cost=?,stock=?,low_stock_alert=?,unit=?,category_id=?,supplier_id=?,image_url=?,is_active=? WHERE id=?`)
    .run(name, sku, barcode, description, price, cost, stock, low_stock_alert, unit, category_id, supplier_id, image_url, is_active ? 1 : 0, req.params.id)
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id))
})

r.patch('/:id/stock', (req, res) => {
  const { adjustment, type } = req.body // type: 'add' | 'set' | 'subtract'
  const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Not found' })
  let newStock = product.stock
  if (type === 'add') newStock += adjustment
  else if (type === 'subtract') newStock = Math.max(0, newStock - adjustment)
  else newStock = adjustment
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, req.params.id)
  res.json({ stock: newStock })
})

r.delete('/:id', (req, res) => {
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default r
