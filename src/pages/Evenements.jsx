import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import toast from 'react-hot-toast'
import { Html5QrcodeScanner } from 'html5-qrcode'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

function Evenements() {
  const [paniers, setPaniers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPanier, setSelectedPanier] = useState(null)
  const [plvsDetailees, setPlvsDetailees] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showAddPLVModal, setShowAddPLVModal] = useState(false)
  const [plvsDisponibles, setPlvsDisponibles] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState(null)

  useEffect(() => {
    fetchPaniers()
  }, [])

  async function fetchPaniers() {
    try {
      const { data, error } = await supabase
        .from('paniers')
        .select(`
          *,
          panier_plv (
            plv_id,
            etat_sortie,
            etat_retour,
            date_retour
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const paniersAvecComptage = data.map(panier => ({
        ...panier,
        plv_count: panier.panier_plv?.length || 0
      }))

      setPaniers(paniersAvecComptage)
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlvsDisponibles() {
    try {
      const { data, error } = await supabase
        .from('plv')
        .select('*, modeles_plv(nom, type)')
        .eq('statut', 'disponible')
        .order('qr_code')

      if (error) throw error
      setPlvsDisponibles(data || [])
    } catch (error) {
      toast.error('Erreur lors du chargement des PLV')
    }
  }

  const voirDetails = async (panier) => {
    setSelectedPanier(panier)
    
    try {
      const { data, error } = await supabase
        .from('panier_plv')
        .select(`
          *,
          plv (
            id,
            qr_code,
            statut,
            modeles_plv (nom, type, categorie)
          )
        `)
        .eq('panier_id', panier.id)

      if (error) throw error
      setPlvsDetailees(data || [])
      setShowModal(true)
    } catch (error) {
      toast.error('Erreur lors du chargement des détails')
    }
  }

  const ajouterPLVAuPanier = async (plvId) => {
    if (!selectedPanier) return

    const loadingToast = toast.loading('Ajout en cours...')

    try {
      // Ajouter dans panier_plv
      const { error: insertError } = await supabase
        .from('panier_plv')
        .insert({
          panier_id: selectedPanier.id,
          plv_id: plvId,
          etat_sortie: 'bon'
        })

      if (insertError) throw insertError

      // Mettre à jour le statut de la PLV
      const { error: updateError } = await supabase
        .from('plv')
        .update({ statut: 'sorti' })
        .eq('id', plvId)

      if (updateError) throw updateError

      toast.dismiss(loadingToast)
      toast.success('✅ PLV ajoutée à l\'événement')
      
      // Rafraîchir les données
      fetchPaniers()
      fetchPlvsDisponibles()
      voirDetails(selectedPanier)
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Erreur : ' + error.message)
    }
  }

  const startScan = () => {
    setScanning(true)
    
    setTimeout(() => {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        videoConstraints: {
          facingMode: { ideal: "environment" }
        }
      }

      const html5QrcodeScanner = new Html5QrcodeScanner("qr-scanner-evenement", config, false)
      
      html5QrcodeScanner.render(
        async (decodedText) => {
          // Trouver la PLV par QR code
          const plv = plvsDisponibles.find(p => p.qr_code === decodedText)
          if (plv) {
            await ajouterPLVAuPanier(plv.id)
          } else {
            toast.error('PLV non trouvée ou pas disponible')
          }
          stopScan()
        },
        (error) => {
          if (!error.includes('NotFoundException')) {
            console.error('Erreur scan:', error)
          }
        }
      )
      
      setScanner(html5QrcodeScanner)
    }, 100)
  }

  const stopScan = () => {
    if (scanner) {
      scanner.clear()
      setScanning(false)
    }
  }

  const cloturerPanier = async (panierId) => {
    const confirmer = () => {
      toast((t) => (
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Clôturer cet événement ?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={async () => {
                toast.dismiss(t.id)
                const loadingToast = toast.loading('Clôture en cours...')
                try {
                  const { error } = await supabase
                    .from('paniers')
                    .update({ statut: 'termine' })
                    .eq('id', panierId)

                  if (error) throw error
                  toast.dismiss(loadingToast)
                  toast.success('✅ Événement clôturé')
                  fetchPaniers()
                  setShowModal(false)
                } catch (error) {
                  toast.dismiss(loadingToast)
                  toast.error('Erreur : ' + error.message)
                }
              }}
              style={{
                background: '#ef4444',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Clôturer
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{
                background: '#6b7280',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      ), { duration: Infinity })
    }
    confirmer()
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Événements</h1>
        <button onClick={fetchPaniers} className="btn btn-secondary">
          🔄 Actualiser
        </button>
      </div>

      {/* Carte */}
      <div style={{ 
        background: 'white', 
        borderRadius: '1rem', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>🗺️ Carte des événements</h2>
        </div>
        
        {paniers.filter(p => p.latitude && p.longitude).length > 0 ? (
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
              {paniers.filter(p => p.latitude && p.longitude).map(panier => (
                <Marker key={panier.id} position={[panier.latitude, panier.longitude]}>
                  <Popup>
                    <div style={{ padding: '0.5rem' }}>
                      <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{panier.nom_evenement}</h3>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>📍 {panier.adresse}</p>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>📦 {panier.plv_count} PLV</p>
                      <button 
                        onClick={() => voirDetails(panier)}
                        className="btn btn-primary"
                        style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.875rem' }}
                      >
                        Voir détails
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontSize: '1.125rem' }}>Aucun événement avec coordonnées</p>
          </div>
        )}
      </div>

      {/* Liste des événements */}
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            Liste des événements
            <span style={{
              marginLeft: '0.75rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.875rem'
            }}>
              {paniers.length}
            </span>
          </h2>
        </div>

        {paniers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <p>Aucun événement</p>
          </div>
        ) : (
          <div style={{ padding: '1rem' }}>
            {paniers.map(panier => (
              <div 
                key={panier.id}
                style={{
                  marginBottom: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  background: '#f9fafb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                      {panier.nom_evenement}
                    </h3>
                    {panier.numero_evenement && (
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        📋 {panier.numero_evenement}
                      </p>
                    )}
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      📍 {panier.adresse}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      📅 Dépôt: {new Date(panier.date_depot_prevue).toLocaleDateString()}
                    </p>
                    {panier.date_recup_prevue && (
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        🔄 Récup: {new Date(panier.date_recup_prevue).toLocaleDateString()}
                      </p>
                    )}
                    {panier.nom_prestataire && (
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        👤 {panier.nom_prestataire}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea', marginBottom: '0.25rem' }}>
                      {panier.plv_count}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>PLV</div>
                    <span style={{
                      display: 'inline-block',
                      background: panier.statut === 'termine' ? '#d1fae5' : '#fef3c7',
                      color: panier.statut === 'termine' ? '#065f46' : '#92400e',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {panier.statut === 'termine' ? '✅ Terminé' : '📦 En cours'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => voirDetails(panier)}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    👁️ Voir détails
                  </button>
                  {panier.statut === 'en_cours' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedPanier(panier)
                          fetchPlvsDisponibles()
                          setShowAddPLVModal(true)
                        }}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        ➕ Ajouter PLV
                      </button>
                      <button
                        onClick={() => cloturerPanier(panier.id)}
                        style={{
                          flex: 1,
                          background: '#fee2e2',
                          color: '#991b1b',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        🔒 Clôturer
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Détails */}
      {showModal && selectedPanier && (
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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ 
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {selectedPanier.nom_evenement}
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {plvsDetailees.length} PLV
              </p>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {plvsDetailees.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af' }}>Aucune PLV</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {plvsDetailees.map(item => (
                    <div key={item.id} style={{
                      padding: '1rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      background: '#f9fafb'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        {item.plv?.qr_code}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {item.plv?.modeles_plv?.nom} - {item.plv?.modeles_plv?.type}
                      </div>
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                        <span style={{
                          background: item.date_retour ? '#d1fae5' : '#fef3c7',
                          color: item.date_retour ? '#065f46' : '#92400e',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {item.date_retour ? `✅ Retourné le ${new Date(item.date_retour).toLocaleDateString()}` : '📦 En cours'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ 
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter PLV */}
      {showAddPLVModal && selectedPanier && (
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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ 
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Ajouter des PLV à {selectedPanier.nom_evenement}
              </h2>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Scanner QR */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  📱 Scanner un QR Code
                </h3>
                {!scanning ? (
                  <button onClick={startScan} className="btn btn-primary" style={{ width: '100%' }}>
                    📷 Activer la caméra
                  </button>
                ) : (
                  <>
                    <div id="qr-scanner-evenement" style={{ width: '100%', marginBottom: '1rem' }}></div>
                    <button onClick={stopScan} className="btn btn-secondary" style={{ width: '100%' }}>
                      ✕ Arrêter le scan
                    </button>
                  </>
                )}
              </div>

              <div style={{ borderTop: '2px dashed #e5e7eb', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  📋 Sélectionner dans la liste
                </h3>
                {plvsDisponibles.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9ca3af' }}>Aucune PLV disponible</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflow: 'auto' }}>
                    {plvsDisponibles.map(plv => (
                      <button
                        key={plv.id}
                        onClick={() => ajouterPLVAuPanier(plv.id)}
                        style={{
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          background: 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#667eea'
                          e.currentTarget.style.background = '#f5f7ff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb'
                          e.currentTarget.style.background = 'white'
                        }}
                      >
                        <div style={{ fontWeight: 'bold' }}>{plv.qr_code}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {plv.modeles_plv?.nom} - {plv.modeles_plv?.type}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ 
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                onClick={() => {
                  setShowAddPLVModal(false)
                  stopScan()
                }}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Evenements