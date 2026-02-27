import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Tickets from './pages/Tickets'
import Locations from './pages/Sites'
import SitesManagement from './pages/SitesManagement'
import Teams from './pages/Teams'
import Users from './pages/Users'
import Categories from './pages/Categories'
import Settings from './pages/Settings'
import Clients from './pages/Clients'
import ClientForm from './pages/ClientForm'
import ClientDetail from './pages/ClientDetail'
import IssueReport from './pages/IssueReport'
import IssueDetail from './pages/IssueDetail'
import PublicIssueReport from './pages/PublicIssueReport'
import Reports from './pages/Reports'
import Logs from './pages/Logs'
import Layout from './components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  // Don't call initialize here - App.tsx already does it
  // This prevents duplicate calls
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-dark-text">Loading...</div>
      </div>
    )
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const { initialize } = useAuthStore()
  
  // Initialize auth on app mount - only once
  useEffect(() => {
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run once on mount
  
  return (
    <Router>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #475569',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/report" element={<PublicIssueReport />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/new" element={<IssueReport />} />
          <Route path="tickets/:id" element={<IssueDetail />} />
          <Route path="sites" element={<SitesManagement />} />
          <Route path="locations" element={<Locations />} />
          <Route path="teams" element={<Teams />} />
          <Route path="users" element={<Users />} />
          <Route path="categories" element={<Categories />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/new" element={<ClientForm />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="clients/:id/edit" element={<ClientForm />} />
          <Route path="settings" element={<Settings />} />
          <Route path="reports" element={<Reports />} />
          <Route path="logs" element={<Logs />} />
          {/* Legacy routes for backward compatibility */}
          <Route path="report" element={<IssueReport />} />
          <Route path="issue/:id" element={<IssueDetail />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App

