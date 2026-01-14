import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabaseClient'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

function Evenements() {
  const [evenements, setEvenements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [plvsEvent, setPlvsEvent] = useState([])

  useEffect(() => {
    fetchEvenements()
  }, [])

  async function fetchEvenements() {
    try {
      const { data, error } = await supabase
        .from('paniers')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setEvenements(data || [])
    } catch (error) {
      console.error('Erreur:', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function voirDetails(event) {
    setSelectedEvent(event)
    
    // Récupérer les PLV de cet événement
    const { data, error } = await supabase
      .from('panier_plv')
      .select(`
        *,
        plv:plv_id (
          qr_code,
          statut,
          modele:modeles_plv(nom, type)
        )
      `)
      .eq('panier_id', event.id)
    
    if (error) {
      console.error('Erreur:', error)
      return
    }
    
    setPlvsEvent(data || [])
  }

  async function cloturerEvenement(id) {
    if (!confirm('Clôturer cet événement ? Les PLV passeront en statut "disponible".')) {
      return
    }

    try {
      // Mettre à jour le statut du panier
      await supabase
        .from('paniers')
        .update({ statut: 'termine' })
        .eq('id', id)

      // Récupérer les PLV de cet événement
      const { data: panierPlvs } = await supabase
        .from('panier_plv')
        .select('plv_id')
        .eq('panier_id', id)

      if (panierPlvs && panierPlvs.length > 0) {
        const plvIds = panierPlvs.map(p => p.plv_id)
        
        // Mettre les PLV en disponible
        await supabase
          .from('plv')
          .update({ statut: 'disponible' })
          .in('id', plvIds)
      }

      alert('✅ Événement clôturé !')
      fetchEvenements()
      setSelectedEvent(null)
    } catch (error) {
      alert('Erreur : ' + error.message)
    }
  }

  async function supprimerEvenement(id) {
    if (!confirm('⚠️ Supprimer définitivement cet événement ? Cette action est irréversible.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('paniers')
        .delete()
        .eq('id', id)
      
      if (error) throw error

      alert('✅ Événement supprimé !')
      fetchEvenements()
      setSelectedEvent(null)
    } catch (error) {
      alert('Erreur : ' + error.message)
    }
  }

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Gestion des événements</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            {evenements.filter(e => e.statut === 'en_cours').length} en cours • {evenements.filter(e => e.statut === 'termine').length} terminés
          </p>
        </div>
      </div>

      {/* Carte des événements en cours */}
      {evenements.filter(e => e.statut === 'en_cours').length > 0 && (
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
              🗺️ Carte des événements en cours
            </h2>
          </div>
          
          <div style={{ height: '400px' }}>
            <MapContainer 
              center={[16.2650, -61.5510]} 
              zoom={10} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              {evenements
                .filter(e => e.statut === 'en_cours' && e.latitude && e.longitude)
                .map(event => (
                  <Marker key={event.id} position={[event.latitude, event.longitude]}>
                    <Popup>
                      <div style={{ padding: '0.5rem' }}>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{event.nom_evenement}</h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>📍 {event.adresse}</p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>📅 {event.date_depot_prevue}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Liste des événements */}
      {evenements.length === 0 ? (
        <div style={{ 
          background: 'white',
          padding: '4rem',
          borderRadius: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Aucun événement
          </h2>
          <p style={{ color: '#6b7280' }}>
            Les événements sont créés automatiquement lors des sorties de stock
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {evenements.map(event => (
            <div 
              key={event.id}
              style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '1rem',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                border: '2px solid #e5e7eb',
                transition: 'all 0.3s'
              }}
              className="stat-card"
            >
              {/* Badge statut */}
              <div style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                marginBottom: '1rem',
                background: event.statut === 'en_cours' ? '#fef3c7' : '#d1fae5',
                color: event.statut === 'en_cours' ? '#92400e' : '#065f46'
              }}>
                {event.statut === 'en_cours' ? '🔄 En cours' : '✅ Terminé'}
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.75rem' }}>
                {event.nom_evenement}
              </h3>

              {event.numero_evenement && (
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  📋 N° {event.numero_evenement}
                </p>
              )}

              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                📍 {event.adresse}
              </p>

              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                📅 Dépôt: {event.date_depot_prevue}
              </p>

              {event.date_recup_prevue && (
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  🔄 Récup: {event.date_recup_prevue}
                </p>
              )}

              {event.nom_prestataire && (
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  👤 {event.nom_prestataire}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                <button 
                  onClick={() => voirDetails(event)}
                  style={{
                    padding: '0.5rem',
                    background: '#e0e7ff',
                    color: '#4338ca',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  👁️ Voir les détails
                </button>

                {event.statut === 'en_cours' && (
                  <button 
                    onClick={() => cloturerEvenement(event.id)}
                    style={{
                      padding: '0.5rem',
                      background: '#d1fae5',
                      color: '#065f46',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Clôturer
                  </button>
                )}

                <button 
                  onClick={() => supprimerEvenement(event.id)}
                  style={{
                    padding: '0.5rem',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal détails */}
      {selectedEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
        onClick={() => setSelectedEvent(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedEvent.nom_evenement}</h2>
              <button 
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✕
              </button>
              import { genererBonDeSortie } from '../utils/pdfGenerator'

// Dans le JSX de la modal, ajoute ce bouton :
<button 
  onClick={() => genererBonDeSortie(selectedEvent, plvsEvent.map(item => ({
    ...item.plv,
    modele: item.plv?.modele
  })))}
  className="btn btn-primary"
  style={{ marginTop: '1rem' }}
>
  📄 Télécharger le bon de sortie PDF
</button>
            </div>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              PLV de cet événement ({plvsEvent.length})
            </h3>

            {plvsEvent.length === 0 ? (
              <p style={{ color: '#6b7280' }}>Aucune PLV</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {plvsEvent.map(item => (
                  <div key={item.id} style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {item.plv?.qr_code}
                    </div>
                    {item.plv?.modele && (
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {item.plv.modele.nom} ({item.plv.modele.type})
                      </div>
                    )}
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      État sortie: <span style={{ fontWeight: '500' }}>{item.etat_sortie}</span>
                    </div>
                    {item.date_retour && (
                      <div style={{ fontSize: '0.875rem', color: '#10b981' }}>
                        ✅ Retourné le {new Date(item.date_retour).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Evenements