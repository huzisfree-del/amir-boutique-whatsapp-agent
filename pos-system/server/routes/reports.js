import { Router } from 'express'
import db from '../db.js'
import { verifyToken } from '../auth.js'

const r = Router()
r.use(verifyToken)

const bid = (req) => req.user.branch_id

r.get('/dashboard', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)

  const todaySales = db.prepare(`SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count FROM orders WHERE branch_id=? AND date(created_at)=? AND status='completed'`).get(bid(req), today)
  const monthSales = db.prepare(`SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count FROM orders WHERE branch_id=? AND strftime('%Y-%m',created_at)=? AND status='completed'`).get(bid(req), thisMonth)
  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers WHERE branch_id=?').get(bid(req))
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE branch_id=? AND is_active=1').get(bid(req))
  const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE branch_id=? AND stock <= low_stock_alert AND is_active=1').get(bid(req))
  const topProducts = db.prepare(`SELECT oi.name, SUM(oi.quantity) as qty, SUM(oi.subtotal) as revenue
    FROM order_items oi JOIN orders o ON oi.order_id=o.id
    WHERE o.branch_id=? AND o.status='completed' AND strftime('%Y-%m',o.created_at)=?
    GROUP BY oi.product_id, oi.name ORDER BY revenue DESC LIMIT 5`).all(bid(req), thisMonth)
  const recentOrders = db.prepare(`SELECT o.*, u.name as cashier_name, c.name as customer_name
    FROM orders o LEFT JOIN users u ON o.cashier_id=u.id LEFT JOIN customers c ON o.customer_id=c.id
    WHERE o.branch_id=? ORDER BY o.created_at DESC LIMIT 8`).all(bid(req))
  const salesLast7 = db.prepare(`SELECT date(created_at) as day, COALESCE(SUM(total),0) as total, COUNT(*) as count
    FROM orders WHERE branch_id=? AND date(created_at) >= date('now','-6 days') AND status='completed'
    GROUP BY day ORDER BY day`).all(bid(req))
  const paymentBreakdown = db.prepare(`SELECT payment_method, COALESCE(SUM(total),0) as total, COUNT(*) as count
    FROM orders WHERE branch_id=? AND strftime('%Y-%m',created_at)=? AND status='completed'
    GROUP BY payment_method`).all(bid(req), thisMonth)

  res.json({ todaySales, monthSales, totalCustomers, totalProducts, lowStock, topProducts, recentOrders, salesLast7, paymentBreakdown })
})

r.get('/sales', (req, res) => {
  const { from, to, group_by = 'day' } = req.query
  const fmt = group_by === 'month' ? '%Y-%m' : group_by === 'week' ? '%Y-%W' : '%Y-%m-%d'
  const data = db.prepare(`SELECT strftime('${fmt}', created_at) as period,
    COALESCE(SUM(total),0) as revenue, COALESCE(SUM(subtotal),0) as subtotal,
    COALESCE(SUM(tax_amount),0) as tax, COALESCE(SUM(discount_amount),0) as discounts,
    COUNT(*) as orders FROM orders
    WHERE branch_id=? AND status='completed'
    ${from ? `AND date(created_at)>='${from}'` : ''} ${to ? `AND date(created_at)<='${to}'` : ''}
    GROUP BY period ORDER BY period`).all(bid(req))
  res.json(data)
})

r.get('/products', (req, res) => {
  const { from, to } = req.query
  const data = db.prepare(`SELECT oi.product_id, oi.name, SUM(oi.quantity) as qty_sold,
    SUM(oi.subtotal) as revenue, p.stock, p.price, p.cost,
    SUM(oi.subtotal) - SUM(oi.quantity * p.cost) as profit
    FROM order_items oi JOIN orders o ON oi.order_id=o.id
    LEFT JOIN products p ON oi.product_id=p.id
    WHERE o.branch_id=? AND o.status='completed'
    ${from ? `AND date(o.created_at)>='${from}'` : ''} ${to ? `AND date(o.created_at)<='${to}'` : ''}
    GROUP BY oi.product_id, oi.name ORDER BY revenue DESC`).all(bid(req))
  res.json(data)
})

r.get('/cashiers', (req, res) => {
  const { from, to } = req.query
  const data = db.prepare(`SELECT o.cashier_id, u.name, COUNT(*) as orders,
    COALESCE(SUM(o.total),0) as revenue
    FROM orders o JOIN users u ON o.cashier_id=u.id
    WHERE o.branch_id=? AND o.status='completed'
    ${from ? `AND date(o.created_at)>='${from}'` : ''} ${to ? `AND date(o.created_at)<='${to}'` : ''}
    GROUP BY o.cashier_id ORDER BY revenue DESC`).all(bid(req))
  res.json(data)
})

r.get('/inventory', (req, res) => {
  const data = db.prepare(`SELECT p.*, c.name as category_name, s.name as supplier_name,
    p.stock * p.cost as stock_value, p.stock * p.price as retail_value
    FROM products p LEFT JOIN categories c ON p.category_id=c.id
    LEFT JOIN suppliers s ON p.supplier_id=s.id
    WHERE p.branch_id=? AND p.is_active=1 ORDER BY p.name`).all(bid(req))
  const summary = db.prepare(`SELECT COUNT(*) as total_products,
    SUM(stock*cost) as total_cost_value, SUM(stock*price) as total_retail_value,
    SUM(CASE WHEN stock <= low_stock_alert THEN 1 ELSE 0 END) as low_stock_count,
    SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock
    FROM products WHERE branch_id=? AND is_active=1`).get(bid(req))
  res.json({ products: data, summary })
})

r.get('/expenses', (req, res) => {
  const { from, to } = req.query
  const data = db.prepare(`SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM expenses WHERE branch_id=?
    ${from ? `AND date >= '${from}'` : ''} ${to ? `AND date <= '${to}'` : ''}
    GROUP BY category ORDER BY total DESC`).all(bid(req))
  const total = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE branch_id=?
    ${from ? `AND date >= '${from}'` : ''} ${to ? `AND date <= '${to}'` : ''}`).get(bid(req))
  res.json({ breakdown: data, total: total.total })
})

export default r
