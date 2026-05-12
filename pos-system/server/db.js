import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'pos.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    currency TEXT DEFAULT 'USD',
    tax_rate REAL DEFAULT 0,
    receipt_footer TEXT DEFAULT 'Thank you for your business!',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('super_admin','admin','manager','cashier')),
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    category_id TEXT REFERENCES categories(id),
    supplier_id TEXT REFERENCES suppliers(id),
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    description TEXT,
    price REAL NOT NULL DEFAULT 0,
    cost REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    low_stock_alert INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'pcs',
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS discounts (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('percentage','fixed')),
    value REAL NOT NULL,
    min_order REAL DEFAULT 0,
    max_uses INTEGER,
    uses INTEGER DEFAULT 0,
    starts_at TEXT,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    customer_id TEXT REFERENCES customers(id),
    cashier_id TEXT REFERENCES users(id),
    discount_id TEXT REFERENCES discounts(id),
    order_number TEXT NOT NULL,
    subtotal REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    change_amount REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    status TEXT DEFAULT 'completed' CHECK(status IN ('completed','refunded','held')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    supplier_id TEXT REFERENCES suppliers(id),
    user_id TEXT REFERENCES users(id),
    po_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','received','cancelled')),
    total REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    name TEXT NOT NULL,
    cost REAL NOT NULL,
    quantity INTEGER NOT NULL,
    received INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    user_id TEXT REFERENCES users(id),
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cash_drawers (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES branches(id),
    cashier_id TEXT REFERENCES users(id),
    opening_cash REAL DEFAULT 0,
    closing_cash REAL,
    sales_total REAL DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','closed')),
    opened_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    branch_id TEXT REFERENCES branches(id),
    key TEXT NOT NULL,
    value TEXT,
    UNIQUE(branch_id, key)
  );
`)

// Seed default branch and super admin
const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('super_admin')
if (!existing) {
  const branchId = uuid()
  const userId = uuid()
  const hash = bcrypt.hashSync('admin123', 10)

  db.prepare(`INSERT INTO branches (id, name, address, phone, email, currency, tax_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    branchId, 'Main Branch', '123 Main Street', '+1 555-0100', 'main@pos.com', 'USD', 8
  )

  db.prepare(`INSERT INTO users (id, branch_id, name, email, password, role)
    VALUES (?, ?, ?, ?, ?, ?)`).run(
    userId, branchId, 'Super Admin', 'admin@pos.com', hash, 'super_admin'
  )

  // Seed categories
  const cats = [
    { name: 'Electronics', color: '#3b82f6' },
    { name: 'Clothing', color: '#8b5cf6' },
    { name: 'Food & Beverages', color: '#f59e0b' },
    { name: 'Health & Beauty', color: '#ec4899' },
    { name: 'Home & Garden', color: '#10b981' },
  ]
  const catStmt = db.prepare('INSERT INTO categories (id, branch_id, name, color) VALUES (?, ?, ?, ?)')
  const catIds = cats.map(c => { const id = uuid(); catStmt.run(id, branchId, c.name, c.color); return id })

  // Seed products
  const prodStmt = db.prepare(`INSERT INTO products (id, branch_id, category_id, name, sku, price, cost, stock, low_stock_alert, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const products = [
    [catIds[0], 'Wireless Headphones', 'SKU-001', 89.99, 45, 24, 5, 'pcs'],
    [catIds[0], 'USB-C Charger', 'SKU-002', 29.99, 12, 48, 10, 'pcs'],
    [catIds[0], 'Bluetooth Speaker', 'SKU-003', 59.99, 28, 15, 5, 'pcs'],
    [catIds[1], 'Cotton T-Shirt', 'SKU-004', 19.99, 8, 100, 10, 'pcs'],
    [catIds[1], 'Denim Jeans', 'SKU-005', 49.99, 22, 60, 10, 'pcs'],
    [catIds[2], 'Green Tea', 'SKU-006', 4.99, 1.5, 200, 20, 'box'],
    [catIds[2], 'Coffee Blend', 'SKU-007', 12.99, 5, 80, 15, 'bag'],
    [catIds[3], 'Face Moisturizer', 'SKU-008', 24.99, 10, 45, 8, 'pcs'],
    [catIds[4], 'Plant Pot', 'SKU-009', 14.99, 6, 30, 5, 'pcs'],
    [catIds[0], 'Smart Watch', 'SKU-010', 199.99, 95, 12, 3, 'pcs'],
  ]
  products.forEach(([catId, name, sku, price, cost, stock, low, unit]) => {
    prodStmt.run(uuid(), branchId, catId, name, sku, price, cost, stock, low, unit)
  })

  // Seed customers
  const custStmt = db.prepare('INSERT INTO customers (id, branch_id, name, email, phone, loyalty_points) VALUES (?, ?, ?, ?, ?, ?)')
  custStmt.run(uuid(), branchId, 'Walk-in Customer', null, null, 0)
  custStmt.run(uuid(), branchId, 'John Smith', 'john@email.com', '+1 555-0101', 150)
  custStmt.run(uuid(), branchId, 'Sarah Johnson', 'sarah@email.com', '+1 555-0102', 320)

  // Seed supplier
  db.prepare('INSERT INTO suppliers (id, branch_id, name, contact_person, email, phone) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuid(), branchId, 'Global Supplies Co.', 'Mark Wilson', 'mark@globalsupplies.com', '+1 555-0200'
  )

  console.log('✅ Database seeded — login: admin@pos.com / admin123')
}

export default db
