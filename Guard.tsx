import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import type { Role } from '../lib/types'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="container">Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function RequireRole({ allow }: { allow: Role[] }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="container">Loading...</div>
  if (!profile) return <Navigate to="/login" replace />
  if (!allow.includes(profile.role)) return <Navigate to="/" replace />
  return null
}
