import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'pos-super-secret-2024'

export const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '24h' })

export const verifyToken = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = jwt.verify(header.slice(7), SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' })
  next()
}
