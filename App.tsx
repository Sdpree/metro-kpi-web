import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '../state/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import EntryPage from './pages/EntryPage'
import StoresPage from './pages/StoresPage'
import StoreDashboardPage from './pages/StoreDashboardPage'
import NotFound from './pages/NotFound'
import { RequireAuth } from './Guard'

function Shell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  return (
    <>
      <div className="nav">
        <div className="left">
          <strong>Metro KPI</strong>
          {profile?.role ? <span className="badge">{profile.role}</span> : null}
        </div>
        <div className="left">
          <a className="badge" href="/">Home</a>
          <a className="badge" href="/entry">Entry</a>
          <a className="badge" href="/stores">Stores</a>
          <button className="btn secondary" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>
      <div className="container">{children}</div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Shell>
                <HomePage />
              </Shell>
            </RequireAuth>
          }
        />
        <Route
          path="/entry"
          element={
            <RequireAuth>
              <Shell>
                <EntryPage />
              </Shell>
            </RequireAuth>
          }
        />
        <Route
          path="/stores"
          element={
            <RequireAuth>
              <Shell>
                <StoresPage />
              </Shell>
            </RequireAuth>
          }
        />
        <Route
          path="/stores/:storeId"
          element={
            <RequireAuth>
              <Shell>
                <StoreDashboardPage />
              </Shell>
            </RequireAuth>
          }
        />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AuthProvider>
  )
}
