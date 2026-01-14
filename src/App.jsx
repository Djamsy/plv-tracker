import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Sortie from './pages/Sortie'
import Retour from './pages/Retour'
import QRCodes from './pages/QRCodes'
import Modeles from './pages/Modeles'
import Exemplaires from './pages/Exemplaires'
import Evenements from './pages/Evenements'
import Historique from './pages/Historique'
import PLV from './pages/PLV'
import SearchBar from './components/SearchBar'
import toast from 'react-hot-toast'
import InstallPWA from './components/InstallPWA'
import './App.css'

function Navigation() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  
  const links = [
    { to: '/', icon: '🏠', label: 'Dashboard' },
    { to: '/sortie', icon: '📦', label: 'Sortie' },
    { to: '/retour', icon: '⬅️', label: 'Retour' },
    { to: '/plv', icon: '🏷️', label: 'PLV' },
    { to: '/qrcodes', icon: '📱', label: 'QR Codes' },
    { to: '/modeles', icon: '📋', label: 'Modèles' },
    { to: '/exemplaires', icon: '🔢', label: 'Exemplaires' },
    { to: '/evenements', icon: '📅', label: 'Événements' },
    { to: '/historique', icon: '📊', label: 'Historique' },
  ]

  const closeMenu = () => setMenuOpen(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Déconnexion réussie')
    } catch (error) {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="brand-icon">📊</span>
          <span className="brand-text">PLV Tracker</span>
        </div>
        
        {/* Barre de recherche */}
        <div className="nav-search">
          <SearchBar />
        </div>
        
        {/* Menu desktop */}
        <div className="nav-links">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
          
          {/* Bouton déconnexion */}
          <button
            onClick={handleSignOut}
            className="nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Déconnexion</span>
          </button>
        </div>

        {/* Burger button mobile */}
        <button 
          className="burger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <>
          <div className="mobile-overlay" onClick={closeMenu}></div>
          <div className="mobile-menu">
            <div style={{ 
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '0.5rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Connecté en tant que
              </p>
              <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                {user?.email}
              </p>
            </div>
            
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`mobile-link ${location.pathname === link.to ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <span className="mobile-icon">{link.icon}</span>
                <span className="mobile-label">{link.label}</span>
              </Link>
            ))}
            
            <button
              onClick={() => {
                handleSignOut()
                closeMenu()
              }}
              className="mobile-link"
              style={{ 
                background: 'none',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                color: '#ef4444'
              }}
            >
              <span className="mobile-icon">🚪</span>
              <span className="mobile-label">Déconnexion</span>
            </button>
          </div>
        </>
      )}
    </nav>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <Dashboard />
            </main>
          </div>
        </ProtectedRoute>
      } />
      <Route path="/sortie" element={
        <ProtectedRoute>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <Sortie />
            </main>
          </div>
        </ProtectedRoute>
      } />
      <Route path="/retour" element={
        <ProtectedRoute>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <Retour />
            </main>
          </div>
        </ProtectedRoute>
      } />
      <Route path="/plv" element={
        <ProtectedRoute>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <PLV />
            </main>
          </div>
        </ProtectedRoute>
      } />
      <Route path="/qrcodes" element={
        <ProtectedRoute>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <QRCodes />
            </main>
          </div>
        </ProtectedRoute>
      } />
      <Route path="/modeles" element={
        <ProtectedRoute>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <Modeles />
            </main>
          </div>
        </ProtectedRoute>
      } />
      <Route path="/exemplaires" element={
        <ProtectedRoute>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <Exemplaires />
            </main>
          </div>
        </ProtectedRoute>
      } />
      <Route path="/evenements" element={
        <ProtectedRoute>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <Evenements />
            </main>
          </div>
        </ProtectedRoute>
      } />
      <Route path="/historique" element={
        <ProtectedRoute>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <Historique />
            </main>
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
         <InstallPWA />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App