import { BrowserRouter, Routes, Route, Link, useLocation, NavLink } from 'react-router-dom'
import { useState, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import SearchBar from './components/SearchBar'
import LoadingSpinner from './components/LoadingSpinner'
import toast, { Toaster } from 'react-hot-toast'
import InstallPWA from './components/InstallPWA'
import './App.css'

// ── Lazy loading : chaque page ne se charge qu'au premier accès ──────────────
const Dashboard   = lazy(() => import('./pages/Dashboard'))
const Sortie      = lazy(() => import('./pages/Sortie'))
const Retour      = lazy(() => import('./pages/Retour'))
const PLV         = lazy(() => import('./pages/PLV'))
const QRCodes     = lazy(() => import('./pages/QRCodes'))
const Modeles     = lazy(() => import('./pages/Modeles'))
const Exemplaires = lazy(() => import('./pages/Exemplaires'))
const Evenements  = lazy(() => import('./pages/Evenements'))
const Historique  = lazy(() => import('./pages/Historique'))

// ── Structure des liens (utilisée nav desktop + mobile) ───────────────────────
const NAV_PRIMARY = [
  { to: '/',           icon: '🏠', label: 'Dashboard'   },
  { to: '/sortie',     icon: '📦', label: 'Sortie'      },
  { to: '/retour',     icon: '⬅️', label: 'Retour'      },
  { to: '/evenements', icon: '📅', label: 'Événements'  },
  { to: '/historique', icon: '📊', label: 'Historique'  },
]

const NAV_SECONDARY = [
  { to: '/plv',         icon: '🏷️', label: 'PLV'         },
  { to: '/qrcodes',     icon: '📱', label: 'QR Codes'    },
  { to: '/modeles',     icon: '📋', label: 'Modèles'     },
  { to: '/exemplaires', icon: '🔢', label: 'Exemplaires' },
]

// ── Barre de navigation desktop ───────────────────────────────────────────────
function TopNav() {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [moreOpen, setMoreOpen]       = useState(false)
  const { user, signOut }             = useAuth()
  const location                      = useLocation()

  const closeAll = () => { setMenuOpen(false); setMoreOpen(false) }

  const handleSignOut = async () => {
    try { await signOut(); toast.success('Déconnexion réussie') }
    catch { toast.error('Erreur lors de la déconnexion') }
    closeAll()
  }

  return (
    <nav className="topnav">
      <div className="topnav-inner">
        {/* Brand */}
        <Link to="/" className="brand" onClick={closeAll}>
          <span className="brand-icon">📊</span>
          <span className="brand-text">PLV Tracker</span>
        </Link>

        {/* Recherche — desktop seulement */}
        <div className="topnav-search">
          <SearchBar />
        </div>

        {/* Liens desktop */}
        <div className="topnav-links">
          {[...NAV_PRIMARY, ...NAV_SECONDARY].map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}
            >
              <span>{link.icon}</span>
              <span className="topnav-label">{link.label}</span>
            </NavLink>
          ))}

          {/* Avatar / déconnexion */}
          <div style={{ position: 'relative' }}>
            <button className="avatar-btn" onClick={() => setMoreOpen(!moreOpen)}>
              {user?.email?.[0]?.toUpperCase() || '?'}
            </button>
            {moreOpen && (
              <>
                <div className="dropdown-overlay" onClick={() => setMoreOpen(false)} />
                <div className="dropdown">
                  <div className="dropdown-user">
                    <span className="dropdown-email">{user?.email}</span>
                  </div>
                  <button className="dropdown-item danger" onClick={handleSignOut}>
                    🚪 Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Burger mobile */}
        <button className="burger-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Menu mobile drawer */}
      {menuOpen && (
        <>
          <div className="drawer-overlay" onClick={closeAll} />
          <div className="drawer">
            <div className="drawer-header">
              <span className="drawer-avatar">{user?.email?.[0]?.toUpperCase()}</span>
              <div>
                <p className="drawer-role">Connecté en tant que</p>
                <p className="drawer-email">{user?.email}</p>
              </div>
            </div>

            <div className="drawer-section-label">PRINCIPAL</div>
            {NAV_PRIMARY.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `drawer-link${isActive ? ' active' : ''}`}
                onClick={closeAll}
              >
                <span className="drawer-icon">{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}

            <div className="drawer-section-label" style={{ marginTop: '0.5rem' }}>GESTION</div>
            {NAV_SECONDARY.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `drawer-link${isActive ? ' active' : ''}`}
                onClick={closeAll}
              >
                <span className="drawer-icon">{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}

            <div className="drawer-footer">
              <button className="drawer-link danger" onClick={handleSignOut}>
                <span className="drawer-icon">🚪</span>
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  )
}

// ── Bottom navigation mobile ──────────────────────────────────────────────────
function BottomNav() {
  const location = useLocation()

  const items = [
    { to: '/',           icon: '🏠', label: 'Home'      },
    { to: '/sortie',     icon: '📦', label: 'Sortie'    },
    { to: '/retour',     icon: '⬅️', label: 'Retour'    },
    { to: '/evenements', icon: '📅', label: 'Événements'},
    { to: '/historique', icon: '📊', label: 'Stats'     },
  ]

  return (
    <nav className="bottomnav">
      {items.map(item => {
        const isActive = item.to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.to)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `bottomnav-item${isActive ? ' active' : ''}`}
          >
            <span className="bottomnav-icon">{item.icon}</span>
            <span className="bottomnav-label">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

// ── Layout global ─────────────────────────────────────────────────────────────
function Layout({ children }) {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">
        <div className="app-content">
          <Suspense fallback={<LoadingSpinner text="Chargement..." />}>
            {children}
          </Suspense>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}

// ── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/sortie" element={<ProtectedRoute><Layout><Sortie /></Layout></ProtectedRoute>} />
      <Route path="/retour" element={<ProtectedRoute><Layout><Retour /></Layout></ProtectedRoute>} />
      <Route path="/plv" element={<ProtectedRoute><Layout><PLV /></Layout></ProtectedRoute>} />
      <Route path="/qrcodes" element={<ProtectedRoute><Layout><QRCodes /></Layout></ProtectedRoute>} />
      <Route path="/modeles" element={<ProtectedRoute><Layout><Modeles /></Layout></ProtectedRoute>} />
      <Route path="/exemplaires" element={<ProtectedRoute><Layout><Exemplaires /></Layout></ProtectedRoute>} />
      <Route path="/evenements" element={<ProtectedRoute><Layout><Evenements /></Layout></ProtectedRoute>} />
      <Route path="/historique" element={<ProtectedRoute><Layout><Historique /></Layout></ProtectedRoute>} />
    </Routes>
  )
}

// ── App root ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '0.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              fontWeight: '500',
            },
            success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
          }}
        />
        <AppRoutes />
        <InstallPWA />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
