import jwt from 'jsonwebtoken'
import prisma from '../config/db.js'

export const protect = async (req, res, next) => {
  const token = req.cookies?.accessToken
  if (!token) return res.status(401).json({ message: 'Not authorised' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user || !user.isActive) return res.status(401).json({ message: 'User not found' })
    const { password, refreshToken, ...safe } = user
    req.user = safe
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired' })
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' })
  }
  next()
}
