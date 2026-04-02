import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import toast from 'react-hot-toast'
import { Html5QrcodeScanner } from 'html5-qrcode'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

/* ── Confirmation toast helper ── */
function confirmToast(message, onConfirm) {
  toast((t) => (
    <div>
      <p style={{ fontWeight: '700', marginBottom: '0.5rem' }}>{message}</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => { toast.dismiss(t.id); onConfirm() }}
          className="btn btn-danger btn-sm"
        >Confirmer</button>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="btn btn-secondary btn-sm"
        >Annuler</button>
      </div>
    </div>
  ), { duration: Infinity })
}

/* ── Statut badge helper ── */
function StatutEvent({ statut }) {
  if (statut === 'termine') return <span className="badge badge-success">✅ Terminé</span>
  return <span className="badge badge-warning">📦 En cours</span>
}

function Evenements() {
  const [paniers, setPaniers]                   = useState([])
  const [loading, setLoading]                   = useState(true)
  const [selectedPanier, setSelectedPanier]     = useState(null)
  const [plvsDetailees, setPlvsDetailees]       = useState([])
  const [showModal, setShowModal]               = useState(false)
  const [showAddModal, setShowAddModal]         = useState(false)
  const [plvsDisponibles, setPlvsDisponibles]   = useState([])
  const [scanning, setScanning]                 = useState(false)
  const [loadingDetails, setLoadingDetails]     = useState(false)
  const scannerRef = useRef(null)

  useEffect(() => {
    fetchPaniers()
    return () => { stopScan() }
  }, [])

  async function fetchPaniers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('paniers')
        .select('*, panier_plv(plv_id, etat_sortie, etat_retour, date_retour)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setPaniers((data || []).map(p => ({ ...p, plv_count: p.panier_plv?.length || 0 })))
    } catch {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlvsDisponibles() {
    const { data, error } = await supabase
      .from('plv')
      .select('*, modeles_plv(nom, type)')
      .eq('statut', 'disponible')
      .order('qr_code')
    if (!error) setPlvsDisponibles(data || [])
  }

  const voirDetails = async (panier) => {
    setSelectedPanier(panier)
    setLoadingDetails(true)
    try {
      const { data, error } = await supabase
        .from('panier_plv')
        .select('*, plv(id, qr_code, statut, modeles_plv(nom, type, categorie))')
        .eq('panier_id', panier.id)
      if (error) throw error
      setPlvsDetailees(data || [])
      setShowModal(true)
    } catch {
      toast.error('Erreur lors du chargement des détails')
    } finally {
      setLoadingDetails(false)
    }
  }

  const ajouterPLV = async (plvId) => {
    const loading = toast.loading('Ajout en cours...')
    try {
      await supabase.from('panier_plv').insert({ panier_id: selectedPanier.id, plv_id: plvId, etat_sortie: 'bon' })
      await supabase.from('plv').update({ statut: 'sorti' }).eq('id', plvId)
      toast.dismiss(loading)
      toast.success('✅ PLV ajoutée')
      fetchPaniers()
      fetchPlvsDisponibles()
      voirDetails(selectedPanier)
    } catch (err) {
      toast.dismiss(loading)
      toast.error('Erreur : ' + err.message)
    }
  }

  const startScan = () => {
    setScanning(true)
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('qr-scanner-evenement',
        { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { facingMode: { ideal: 'environment' } } },
        false
      )
      scanner.render(
        async (decoded) => {
          const plv = plvsDisponibles.find(p => p.qr_code === decoded)
          if (plv) { await ajouterPLV(plv.id) }
          else { toast.error('PLV non trouvée ou indisponible') }
          stopScan()
        },
        (err) => { if (!err.includes('NotFoundException')) console.error(err) }
      )
      scannerRef.current = scanner
    }, 100)
  }

  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  const cloturerPanier = (id) => {
    confirmToast('Clôturer cet événement ?', async () => {
      const t = toast.loading('Clôture en cours...')
      try {
        const { error } = await supabase.from('paniers').update({ statut: 'termine' }).eq('id', id)
        if (error) throw error
        toast.dismiss(t)
        toast.success('✅ Événement clôturé')
        fetchPaniers()
        setShowModal(false)
      } catch (err) {
        toast.dismiss(t)
        toast.error('Erreur : ' + err.message)
      }
    })
  }

  if (loading) return <LoadingSpinner text="Chargement des événements..." />

  const enCours  = paniers.filter(p => p.statut === 'en_cours')
  const termines = paniers.filter(p => p.statut === 'termine')
  const avecGPS  = paniers.filter(p => p.latitude && p.longitude)

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Événements</h1>
          <p>{enCours.length} en cours · {termines.length} terminé{termines.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-header-actions">
          <button onClick={fetchPaniers} className="btn btn-secondary hover-grow">🔄 Actualiser</button>
        </div>
      </div>

      {/* ── Carte ── */}
      {avecGPS.length > 0 && (
        <div className="card animate-slideInUp">
          <div className="card-header">
            <h2>🗺️ Carte des événements</h2>
            <span className="badge badge-primary">{avecGPS.length} localisé{avecGPS.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ height: '360px' }}>
            <MapContainer center={[16.265, -61.551]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
              {avecGPS.map(p => (
                <Marker key={p.id} position={[p.latitude, p.longitude]}>
                  <Popup>
                    <div style={{ padding: '0.25rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{p.nom_evenement}</strong>
                      <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>📍 {p.adresse}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>📦 {p.plv_count} PLV</div>
                      <button onClick={() => voirDetails(p)} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem', width: '100%' }}>
                        Voir les détails
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* ── Liste ── */}
      <div className="card animate-slideInUp">
        <div className="card-header">
          <h2>Tous les événements</h2>
          <span className="badge badge-neutral">{paniers.length}</span>
        </div>

        {paniers.length === 0 ? (
          <div className="card-body">
            <EmptyState icon="📅" title="Aucun événement" description="Créez un événement depuis la page Sortie" />
          </div>
        ) : (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {paniers.map((panier, i) => (
              <div
                key={panier.id}
                className={`event-card stagger-item${panier.statut === 'termine' ? ' is-done' : ''}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="event-card-top">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                      <h3 style={{ fontSize: '1.0625rem', fontWeight: '700', color: 'var(--gray-900)' }}>
                        {panier.nom_evenement}
                      </h3>
                    </div>
                    <div className="event-card-meta">
                      {panier.numero_evenement && (
                        <span className="event-card-meta-item">📋 {panier.numero_evenement}</span>
                      )}
                      <span className="event-card-meta-item">📍 {panier.adresse}</span>
                      <span className="event-card-meta-item">
                        📅 Dépôt : {new Date(panier.date_depot_prevue).toLocaleDateString('fr-FR')}
                      </span>
                      {panier.date_recup_prevue && (
                        <span className="event-card-meta-item">
                          🔄 Récup : {new Date(panier.date_recup_prevue).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {panier.nom_prestataire && (
                        <span className="event-card-meta-item">👤 {panier.nom_prestataire}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                    <StatutEvent statut={panier.statut} />
                    <div style={{ textAlign: 'right' }}>
                      <div className="event-card-plv">{panier.plv_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PLV</div>
                    </div>
                  </div>
                </div>

                <div className="event-card-actions">
                  <button onClick={() => voirDetails(panier)} className="btn btn-primary btn-sm hover-grow" style={{ flex: 1 }}>
                    👁️ Voir les PLV
                  </button>
                  {panier.statut === 'en_cours' && (
                    <>
                      <button
                        onClick={() => { setSelectedPanier(panier); fetchPlvsDisponibles(); setShowAddModal(true) }}
                        className="btn btn-secondary btn-sm hover-grow"
                        style={{ flex: 1 }}
                      >
                        ➕ Ajouter PLV
                      </button>
                      <button
                        onClick={() => cloturerPanier(panier.id)}
                        className="btn btn-sm hover-grow"
                        style={{ flex: 1, background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer', fontWeight: '600' }}
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

      {/* ── Modal Détails ── */}
      {showModal && selectedPanier && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedPanier.nom_evenement}</h2>
                <p>{plvsDetailees.length} PLV dans ce panier</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {loadingDetails ? (
                <LoadingSpinner text="Chargement..." />
              ) : plvsDetailees.length === 0 ? (
                <EmptyState icon="📦" title="Aucune PLV" description="Ajoutez des PLV à cet événement" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {plvsDetailees.map((item, i) => (
                    <div
                      key={item.id}
                      className="stagger-item"
                      style={{
                        padding: '0.875rem 1rem',
                        border: '1.5px solid var(--gray-200)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--gray-50)',
                        animationDelay: `${i * 0.04}s`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.125rem' }}>
                          {item.plv?.qr_code}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                          {item.plv?.modeles_plv?.nom} · {item.plv?.modeles_plv?.type}
                        </div>
                      </div>
                      <span className={`badge ${item.date_retour ? 'badge-success' : 'badge-warning'}`}>
                        {item.date_retour
                          ? `✅ Retourné le ${new Date(item.date_retour).toLocaleDateString('fr-FR')}`
                          : '📦 En cours'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedPanier.statut === 'en_cours' && (
                <button onClick={() => cloturerPanier(selectedPanier.id)} className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                  🔒 Clôturer
                </button>
              )}
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ajouter PLV ── */}
      {showAddModal && selectedPanier && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); stopScan() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Ajouter des PLV</h2>
                <p>{selectedPanier.nom_evenement}</p>
              </div>
              <button className="modal-close" onClick={() => { setShowAddModal(false); stopScan() }}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Scanner */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--gray-700)', marginBottom: '0.75rem' }}>
                  📱 Scanner un QR Code
                </h3>
                {!scanning ? (
                  <button onClick={startScan} className="btn btn-primary hover-grow" style={{ width: '100%' }}>
                    📷 Activer la caméra
                  </button>
                ) : (
                  <div>
                    <div id="qr-scanner-evenement" style={{ width: '100%', marginBottom: '0.75rem' }} />
                    <button onClick={stopScan} className="btn btn-secondary hover-grow" style={{ width: '100%' }}>
                      ✕ Arrêter le scan
                    </button>
                  </div>
                )}
              </div>

              <div className="section-divider">ou sélectionner dans la liste</div>

              {/* Liste */}
              {plvsDisponibles.length === 0 ? (
                <EmptyState icon="📦" title="Aucune PLV disponible" description="Toutes les PLV sont sorties" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                  {plvsDisponibles.map((plv, i) => (
                    <button
                      key={plv.id}
                      onClick={() => ajouterPLV(plv.id)}
                      className="stagger-item"
                      style={{
                        padding: '0.75rem 1rem',
                        border: '1.5px solid var(--gray-200)',
                        borderRadius: 'var(--radius)',
                        background: 'white',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                        animationDelay: `${i * 0.025}s`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.background = 'white' }}
                    >
                      <div style={{ fontWeight: '700', fontSize: '0.9375rem', color: 'var(--gray-900)' }}>{plv.qr_code}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.125rem' }}>
                        {plv.modeles_plv?.nom} · {plv.modeles_plv?.type}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => { setShowAddModal(false); stopScan() }} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
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
