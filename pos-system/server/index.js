import express from 'express'
import cors from 'cors'
import './db.js'

import authRoutes from './routes/auth.js'
import branchRoutes from './routes/branches.js'
import userRoutes from './routes/users.js'
import productRoutes from './routes/products.js'
import categoryRoutes from './routes/categories.js'
import orderRoutes from './routes/orders.js'
import customerRoutes from './routes/customers.js'
import supplierRoutes from './routes/suppliers.js'
import discountRoutes from './routes/discounts.js'
import expenseRoutes from './routes/expenses.js'
import purchaseOrderRoutes from './routes/purchase-orders.js'
import reportRoutes from './routes/reports.js'
import settingsRoutes from './routes/settings.js'
import cashDrawerRoutes from './routes/cash-drawers.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/branches', branchRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/discounts', discountRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/purchase-orders', purchaseOrderRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/cash-drawers', cashDrawerRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`✅ POS Server running on http://localhost:${PORT}`))
