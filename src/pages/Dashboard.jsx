import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ── Tooltip recharts custom ──────────────────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb',
      borderRadius: '0.5rem', padding: '0.5rem 0.875rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.875rem'
    }}>
      <span style={{ fontWeight: '600' }}>{payload[0].name} : </span>
      <span style={{ color: payload[0].fill || payload[0].color }}>{payload[0].value}</span>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const [exemplaires, setExemplaires] = useState([])
  const [paniers,     setPaniers]     = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [{ data: exData }, { data: pData }] = await Promise.all([
        supabase.from('plv').select('*'),
        supabase.from('paniers').select('*, panier_plv(id, date_retour)')
          .eq('statut', 'en_cours')
          .order('date_recup_prevue', { ascending: true }),
      ])
      setExemplaires(exData || [])
      setPaniers(pData || [])
    } catch (err) {
      console.error('Erreur dashboard:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const total       = exemplaires.length
  const disponibles = exemplaires.filter(e => e.statut === 'disponible').length
  const sortis      = exemplaires.filter(e => e.statut === 'sorti').length
  const maintenance = exemplaires.filter(e => e.statut === 'maintenance').length
  const perdus      = exemplaires.filter(e => e.statut === 'perdu').length

  const today = new Date().toISOString().split('T')[0]
  const retards = paniers.filter(p => p.date_recup_prevue && p.date_recup_prevue < today)

  const pieData = [
    { name: 'Disponibles', value: disponibles, color: '#10b981' },
    { name: 'Sorties',     value: sortis,      color: '#f59e0b' },
    { name: 'Maintenance', value: maintenance,  color: '#ef4444' },
    { name: 'Perdues',     value: perdus,       color: '#6b7280' },
  ].filter(d => d.value > 0)

  const barData = [
    { name: 'Dispo',   value: disponibles, fill: '#10b981' },
    { name: 'Sorties', value: sortis,      fill: '#f59e0b' },
    { name: 'Maint.',  value: maintenance, fill: '#ef4444' },
    { name: 'Perdues', value: perdus,      fill: '#9ca3af' },
  ]

  const QUICK_ACTIONS = [
    { to: '/sortie',     icon: '📦', label: 'Nouvelle sortie'  },
    { to: '/retour',     icon: '⬅️', label: 'Retour stock'     },
    { to: '/plv',        icon: '➕', label: 'Créer PLV'        },
    { to: '/evenements', icon: '📅', label: 'Événements'       },
    { to: '/qrcodes',    icon: '📱', label: 'QR Codes'         },
    { to: '/historique', icon: '📊', label: 'Historique'       },
  ]

  if (loading) return <LoadingSpinner text="Chargement du dashboard..." />

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchData} className="btn btn-secondary hover-grow" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
          🔄 Actualiser
        </button>
      </div>

      {/* ── Alerte retards ─────────────────────────────────────────────── */}
      {retards.length > 0 && (
        <div className="animate-fadeIn" style={{
          background: '#fff7ed', border: '2px solid #fb923c',
          borderRadius: '0.875rem', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: '700', color: '#9a3412', margin: 0 }}>
                {retards.length} retour{retards.length > 1 ? 's' : ''} en retard
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#c2410c', margin: '0.15rem 0 0' }}>
                {retards.map(p => p.nom_evenement).join(' · ')}
              </p>
            </div>
          </div>
          <Link to="/retour" style={{
            background: '#ea580c', color: 'white', textDecoration: 'none',
            padding: '0.5rem 1rem', borderRadius: '0.5rem',
            fontWeight: '600', fontSize: '0.875rem', whiteSpace: 'nowrap'
          }}>
            Gérer →
          </Link>
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total PLV',   icon: '📊', value: total,       color: 'var(--gray-900)' },
          { label: 'Disponibles', icon: '✅', value: disponibles,  color: '#10b981' },
          { label: 'En dispatch', icon: '📦', value: sortis,       color: '#f59e0b' },
          { label: 'Maintenance', icon: '🔧', value: maintenance,  color: '#ef4444' },
        ].map(({ label, icon, value, color }, i) => (
          <div key={label} className={`stat-card stagger-item hover-lift`} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="stat-card-header">
              <span className="stat-label">{label}</span>
              <span className="stat-icon">{icon}</span>
            </div>
            <div className="stat-value" style={{ color }}>{value}</div>
            {total > 0 && (
              <div style={{ marginTop: '0.625rem', height: '4px', background: 'var(--gray-100)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round((value / total) * 100)}%`, background: color, borderRadius: '9999px', transition: 'width 0.6s ease' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Quick actions ───────────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
          Actions rapides
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
          {QUICK_ACTIONS.map(({ to, icon, label }) => (
            <Link key={to} to={to} className="quick-action-card">
              <span className="quick-action-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Graphiques ─────────────────────────────────────────────────── */}
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Pie */}
          <div className="animate-slideInUp" style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)', padding: '1.25rem' }}>
            <h3 style={{ fontWeight: '700', fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '1rem' }}>
              📊 Répartition du stock
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Légende */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              {pieData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--gray-500)' }}>{d.name}</span>
                  <span style={{ fontWeight: '700', color: 'var(--gray-900)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar */}
          <div className="animate-slideInUp" style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)', padding: '1.25rem', animationDelay: '0.08s' }}>
            <h3 style={{ fontWeight: '700', fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '1rem' }}>
              📈 État du stock
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="value" name="PLV" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Dispatches actifs ───────────────────────────────────────────── */}
      {paniers.length > 0 && (
        <div className="animate-slideInUp" style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '1.125rem 1.5rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--gray-900)', margin: 0 }}>
              📦 Dispatches actifs
              <span style={{ marginLeft: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700' }}>
                {paniers.length}
              </span>
            </h2>
            <Link to="/evenements" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
              Voir tout →
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  {['Événement', 'Adresse', 'PLV', 'Récup prévue', 'Progression', ''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-400)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paniers.map(panier => {
                  const total   = panier.panier_plv?.length || 0
                  const retournees = panier.panier_plv?.filter(pp => pp.date_retour).length || 0
                  const pct     = total > 0 ? Math.round((retournees / total) * 100) : 0
                  const enRetard = panier.date_recup_prevue && panier.date_recup_prevue < today
                  return (
                    <tr key={panier.id} style={{ borderBottom: '1px solid var(--gray-100)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ fontWeight: '600', color: 'var(--gray-900)', fontSize: '0.9375rem' }}>{panier.nom_evenement}</span>
                        {panier.numero_evenement && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-400)' }}>N° {panier.numero_evenement}</span>}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--gray-500)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {panier.adresse || '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        <span style={{ fontWeight: '700', color: 'var(--gray-900)' }}>{total}</span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.875rem', color: enRetard ? 'var(--danger)' : 'var(--gray-700)' }}>
                          {enRetard ? '⚠️ ' : ''}{formatDate(panier.date_recup_prevue)}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', minWidth: '120px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--gray-100)', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : 'var(--primary)', borderRadius: '9999px', transition: 'width 0.4s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <Link to="/retour" style={{
                          fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none',
                          fontWeight: '600', padding: '0.3rem 0.625rem',
                          border: '1px solid var(--primary-light)',
                          background: 'var(--primary-light)',
                          borderRadius: '0.375rem', whiteSpace: 'nowrap',
                          transition: 'all 0.15s'
                        }}>
                          Retour →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Carte ───────────────────────────────────────────────────────── */}
      <div className="animate-slideInUp" style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '1.125rem 1.5rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--gray-900)', margin: 0 }}>🗺️ Carte des événements</h2>
          <span className="badge-pulse" style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.15rem 0.55rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700' }}>
            {paniers.length}
          </span>
        </div>
        {paniers.length > 0 ? (
          <div style={{ height: '420px' }}>
            <MapContainer center={[16.2650, -61.5510]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              {paniers.filter(p => p.latitude && p.longitude).map(panier => {
                const enRetard = panier.date_recup_prevue && panier.date_recup_prevue < today
                return (
                  <Marker key={panier.id} position={[panier.latitude, panier.longitude]}>
                    <Popup>
                      <div style={{ minWidth: '180px' }}>
                        <p style={{ fontWeight: '700', marginBottom: '0.375rem' }}>{panier.nom_evenement}</p>
                        {panier.adresse && <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>📍 {panier.adresse}</p>}
                        <p style={{ fontSize: '0.8125rem', color: enRetard ? '#ef4444' : '#6b7280', fontWeight: enRetard ? '600' : '400', marginTop: '0.25rem' }}>
                          {enRetard ? '⚠️ Récup en retard' : `🔄 Récup: ${formatDate(panier.date_recup_prevue)}`}
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          📦 {panier.panier_plv?.length || 0} PLV(s)
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>
        ) : (
          <EmptyState icon="📭" title="Aucun événement en cours" description="Les dispatches apparaîtront ici sur la carte" />
        )}
      </div>
    </div>
  )
}

export default Dashboard
