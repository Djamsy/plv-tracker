import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabaseClient'
import L from 'leaflet'
import StatsCharts from '../components/StatsCharts'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

function Dashboard() {
  const [exemplaires, setExemplaires] = useState([])
  const [paniers, setPaniers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: exemplairesData, error: exemplairesError } = await supabase
        .from('plv')
        .select('*')
      
      if (exemplairesError) throw exemplairesError

      const { data: paniersData, error: paniersError } = await supabase
        .from('paniers')
        .select('*')
        .eq('statut', 'en_cours')
      
      if (paniersError) throw paniersError

      setExemplaires(exemplairesData || [])
      setPaniers(paniersData || [])
    } catch (error) {
      console.error('Erreur:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const totalExemplaires = exemplaires.length
  const disponibles = exemplaires.filter(e => e.statut === 'disponible').length
  const sortis = exemplaires.filter(e => e.statut === 'sorti').length
  const maintenance = exemplaires.filter(e => e.statut === 'maintenance').length

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Dashboard PLV</h1>
        <button onClick={fetchData} className="btn btn-secondary">
          <span>🔄</span>
          <span>Actualiser</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1rem' 
      }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total</span>
            <span className="stat-icon">📊</span>
          </div>
          <div className="stat-value">{totalExemplaires}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Disponibles</span>
            <span className="stat-icon">✅</span>
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>{disponibles}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Sorties</span>
            <span className="stat-icon">📦</span>
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{sortis}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Maintenance</span>
            <span className="stat-icon">🔧</span>
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{maintenance}</div>
        </div>
      </div>

      {/* Graphiques - commenté pour l'instant */}
      {/* Graphiques */}
<StatsCharts 
  totalExemplaires={totalExemplaires}
  disponibles={disponibles}
  sortis={sortis}
  maintenance={maintenance}
/>
      {/* <StatsCharts stats={stats} /> */}

      {/* Carte */}
      <div style={{ 
        background: 'white', 
        borderRadius: '1rem', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
            🗺️ Événements en cours
          </h2>
          <span style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            {paniers.length}
          </span>
        </div>
        
        {paniers.length > 0 ? (
          <div style={{ height: '500px' }}>
            <MapContainer 
              center={[16.2650, -61.5510]} 
              zoom={10} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              {paniers.filter(p => p.latitude && p.longitude).map(panier => (
                <Marker key={panier.id} position={[panier.latitude, panier.longitude]}>
                  <Popup>
                    <div style={{ padding: '0.5rem' }}>
                      <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{panier.nom_evenement}</h3>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>📍 {panier.adresse}</p>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>📅 Dépôt: {panier.date_depot_prevue}</p>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>🔄 Récup: {panier.date_recup_prevue}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div style={{ 
            padding: '4rem', 
            textAlign: 'center', 
            color: '#9ca3af' 
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontSize: '1.125rem' }}>Aucun événement en cours</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard