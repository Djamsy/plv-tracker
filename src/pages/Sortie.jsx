import { useState, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '../supabaseClient'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { genererBonDeSortie } from '../utils/pdfGenerator'
import toast from 'react-hot-toast'
import { config } from '../config'
import EmptyState from '../components/EmptyState'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

function Sortie() {
  const [panier, setPanier] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [modeles, setModeles] = useState([])
  const [exemplairesParModele, setExemplairesParModele] = useState({})
  const [modeSelection, setModeSelection] = useState('scan')
  const [formData, setFormData] = useState({
    nom_evenement: '',
    numero_evenement: '',
    adresse: '',
    latitude: null,
    longitude: null,
    date_depot_prevue: '',
    date_recup_prevue: '',
    nom_prestataire: ''
  })

  useEffect(() => {
    fetchModeles()
  }, [])

  async function fetchModeles() {
    try {
      const { data: modelesData, error: modelesError } = await supabase
        .from('modeles_plv')
        .select('*')
        .order('nom')
      
      if (modelesError) throw modelesError

      const { data: exemplairesData, error: exemplairesError } = await supabase
        .from('plv')
        .select('*')
        .eq('statut', 'disponible')
      
      if (exemplairesError) throw exemplairesError

      const groupes = {}
      exemplairesData.forEach(ex => {
        if (!groupes[ex.modele_id]) {
          groupes[ex.modele_id] = []
        }
        groupes[ex.modele_id].push(ex)
      })

      setModeles(modelesData || [])
      setExemplairesParModele(groupes)
    } catch (error) {
      console.error('Erreur:', error.message)
    }
  }

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setFormData({
          ...formData,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        })
        toast.success('📍 Position définie sur la carte')
      },
    })
    return null
  }

  const geocodeAddress = async () => {
    if (!formData.adresse) {
      toast.error('Entrez d\'abord une adresse !')
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.adresse + ', Guadeloupe')}`
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        setFormData({
          ...formData,
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        })
        toast.success('✅ Coordonnées trouvées !')
      } else {
        toast.error('❌ Adresse non trouvée. Cliquez sur la carte.')
      }
    } catch (error) {
      toast.error('Erreur lors du géocodage.')
    }
  }

  const ajouterAuPanier = (plv) => {
    if (panier.find(p => p.id === plv.id)) {
      toast.error('PLV déjà dans le panier !')
      return
    }
    setPanier([...panier, plv])
    toast.success(`✅ ${plv.qr_code} ajoutée au panier !`)
  }

  const onScanSuccess = async (qrCode) => {
    const { data, error } = await supabase
      .from('plv')
      .select('*')
      .eq('qr_code', qrCode)
      .eq('statut', 'disponible')
      .single()

    if (error || !data) {
      toast.error('❌ PLV non trouvée ou pas disponible !')
      return
    }

    ajouterAuPanier(data)
  }

  const testScan = (qrCode) => {
    onScanSuccess(qrCode)
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

    const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false)
    
    html5QrcodeScanner.render(
      (decodedText) => {
        onScanSuccess(decodedText)
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

  const retirerDuPanier = (id) => {
    setPanier(panier.filter(p => p.id !== id))
    toast('PLV retirée du panier', { icon: '🗑️' })
  }

  const validerSortie = async () => {
    if (!formData.nom_evenement || !formData.adresse || !formData.date_depot_prevue) {
      toast.error('Remplis au moins le nom, l\'adresse et la date de dépôt !')
      return
    }

    const loadingToast = toast.loading('Enregistrement en cours...')

    try {
      const { data: panierCreated, error: panierError } = await supabase
        .from('paniers')
        .insert({
          nom_evenement: formData.nom_evenement,
          numero_evenement: formData.numero_evenement,
          adresse: formData.adresse,
          latitude: formData.latitude,
          longitude: formData.longitude,
          date_depot_prevue: formData.date_depot_prevue,
          date_recup_prevue: formData.date_recup_prevue,
          nom_prestataire: formData.nom_prestataire,
          statut: 'en_cours'
        })
        .select()
        .single()

      if (panierError) throw panierError

      const panierPlvs = panier.map(plv => ({
        panier_id: panierCreated.id,
        plv_id: plv.id,
        etat_sortie: 'bon'
      }))

      const { error: plvError } = await supabase
        .from('panier_plv')
        .insert(panierPlvs)

      if (plvError) throw plvError

      const plvIds = panier.map(p => p.id)
      await supabase
        .from('plv')
        .update({ statut: 'sorti' })
        .in('id', plvIds)

      toast.dismiss(loadingToast)
      toast.success('✅ Sortie enregistrée ! PDF téléchargé.')
      
      genererBonDeSortie(panierCreated, panier)
      
      setPanier([])
      setShowForm(false)
      setFormData({
        nom_evenement: '',
        numero_evenement: '',
        adresse: '',
        latitude: null,
        longitude: null,
        date_depot_prevue: '',
        date_recup_prevue: '',
        nom_prestataire: ''
      })
      fetchModeles()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Erreur : ' + error.message)
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Sortie de stock</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f3f4f6', padding: '0.25rem', borderRadius: '0.75rem' }}>
          <button
            onClick={() => setModeSelection('scan')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              background: modeSelection === 'scan' ? 'white' : 'transparent',
              boxShadow: modeSelection === 'scan' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📷 Scan QR
          </button>
          <button
            onClick={() => setModeSelection('liste')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              background: modeSelection === 'liste' ? 'white' : 'transparent',
              boxShadow: modeSelection === 'liste' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📋 Liste
          </button>
        </div>
      </div>

      {modeSelection === 'scan' && (
        <>
          {config.features.testButtons && (
            <div style={{
              background: '#fef3c7',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '2px solid #fbbf24'
            }}>
              <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>🧪 Mode TEST (sans caméra)</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => testScan('PLV001')} className="btn btn-secondary">Test PLV001</button>
                <button onClick={() => testScan('PLV002')} className="btn btn-secondary">Test PLV002</button>
                <button onClick={() => testScan('PLV003')} className="btn btn-secondary">Test PLV003</button>
              </div>
            </div>
          )}

         <div style={{ 
  background: 'white', 
  padding: '1.5rem', 
  borderRadius: '1rem',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
}}>
  <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
    📱 Scanner un QR Code
  </h3>
  
  {!scanning ? (
    <>
      <button onClick={startScan} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
        📷 Activer la caméra
      </button>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem', textAlign: 'center' }}>
        Le navigateur va demander l'accès à la caméra
      </p>
    </>
  ) : (
    <>
      <div id="qr-reader" style={{ width: '100%', marginBottom: '1rem' }}></div>
      <button onClick={stopScan} className="btn btn-secondary" style={{ width: '100%' }}>
        ✕ Arrêter le scan
      </button>
    </>
  )}
</div>
        </>
      )}

      {modeSelection === 'liste' && (
        <div style={{ 
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Sélectionner par modèle</h2>
          </div>

          {modeles.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
              <p>Aucun modèle disponible</p>
            </div>
          ) : (
            <div style={{ padding: '1rem' }}>
              {modeles.map(modele => {
                const exemplaires = exemplairesParModele[modele.id] || []
                const nbDispo = exemplaires.length
                const nbDansPanier = panier.filter(p => p.modele_id === modele.id).length

                return (
                  <div 
                    key={modele.id}
                    style={{
                      marginBottom: '1rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{
                      background: '#f9fafb',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{modele.nom}</h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Type: {modele.type} • Catégorie: {modele.categorie || '-'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: nbDispo > 0 ? '#10b981' : '#ef4444' }}>
                          {nbDispo}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>disponibles</div>
                        {nbDansPanier > 0 && (
                          <div style={{ fontSize: '0.875rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                            ({nbDansPanier} dans le panier)
                          </div>
                        )}
                      </div>
                    </div>

                    {nbDispo > 0 && (
                      <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {exemplaires.map(ex => (
                          <button
                            key={ex.id}
                            onClick={() => ajouterAuPanier(ex)}
                            disabled={panier.find(p => p.id === ex.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              border: '2px solid',
                              borderColor: panier.find(p => p.id === ex.id) ? '#d1d5db' : '#667eea',
                              borderRadius: '0.5rem',
                              background: panier.find(p => p.id === ex.id) ? '#f3f4f6' : 'white',
                              color: panier.find(p => p.id === ex.id) ? '#9ca3af' : '#667eea',
                              fontWeight: '600',
                              cursor: panier.find(p => p.id === ex.id) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {panier.find(p => p.id === ex.id) ? '✓ ' : ''}{ex.qr_code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ 
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Panier de sortie
          <span style={{
            marginLeft: '0.75rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.875rem'
          }}>
            {panier.length}
          </span>
        </h2>

        {panier.length === 0 ? (
          <EmptyState
            icon="📦"
            title="Panier vide"
            description="Scannez ou sélectionnez des PLV pour commencer"
            action={{
              label: "Scanner un QR",
              onClick: () => setModeSelection('scan')
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {panier.map(plv => (
              <div key={plv.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: '#f9fafb',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem'
              }}>
                <span style={{ fontWeight: '600', fontSize: '1rem' }}>{plv.qr_code}</span>
                <button
                  onClick={() => retirerDuPanier(plv.id)}
                  style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        )}

        {panier.length > 0 && !showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="btn btn-primary" 
            style={{ marginTop: '1rem', width: '100%' }}
          >
            ➡️ Continuer vers le formulaire
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ 
          background: 'white',
          padding: '2rem', 
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            📋 Informations événement
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Nom événement *
              </label>
              <input
                type="text"
                placeholder="Ex: Salon du sport Pointe-à-Pitre"
                value={formData.nom_evenement}
                onChange={(e) => setFormData({...formData, nom_evenement: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Numéro événement
              </label>
              <input
                type="text"
                placeholder="Ex: EV-2026-001"
                value={formData.numero_evenement}
                onChange={(e) => setFormData({...formData, numero_evenement: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Adresse de dépôt *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ex: Centre Commercial Destrellan, Baie-Mahault"
                  value={formData.adresse}
                  onChange={(e) => setFormData({...formData, adresse: e.target.value})}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
                <button
                  type="button"
                  onClick={geocodeAddress}
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  📍 Géocoder
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Cliquez sur "Géocoder" pour trouver les coordonnées automatiquement
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Position sur la carte
              </label>
              <div style={{ 
                height: '350px', 
                borderRadius: '0.75rem', 
                overflow: 'hidden',
                border: '2px solid #e5e7eb'
              }}>
                <MapContainer 
                  center={[16.2650, -61.5510]} 
                  zoom={11} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <MapClickHandler />
                  {formData.latitude && formData.longitude && (
                    <Marker position={[formData.latitude, formData.longitude]}>
                      <Popup>📍 Emplacement de l'événement</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Cliquez sur la carte pour définir la position manuellement
              </p>
            </div>

            {formData.latitude && formData.longitude && (
              <div style={{ 
                padding: '1rem', 
                background: '#f0fdf4', 
                border: '2px solid #86efac',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                ✅ Coordonnées : {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Date dépôt prévue *
                </label>
                <input
                  type="date"
                  value={formData.date_depot_prevue}
                  onChange={(e) => setFormData({...formData, date_depot_prevue: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Date récup prévue
                </label>
                <input
                  type="date"
                  value={formData.date_recup_prevue}
                  onChange={(e) => setFormData({...formData, date_recup_prevue: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Nom prestataire
              </label>
              <input
                type="text"
                placeholder="Ex: Events Pro Guadeloupe"
                value={formData.nom_prestataire}
                onChange={(e) => setFormData({...formData, nom_prestataire: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={validerSortie} className="btn btn-primary" style={{ flex: 1 }}>
                ✅ Valider la sortie
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">
                ❌ Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sortie