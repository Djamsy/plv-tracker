import { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'
import { config } from '../config'
import LoadingSpinner from '../components/LoadingSpinner'

// ─── Constantes ─────────────────────────────────────────────────────────────
const ETAT_OPTIONS = [
  { value: 'bon',         label: 'Bon état',    icon: '✅', color: '#10b981', bg: '#d1fae5', border: '#10b981' },
  { value: 'maintenance', label: 'Maintenance',  icon: '🔧', color: '#f59e0b', bg: '#fef3c7', border: '#f59e0b' },
  { value: 'perdu',       label: 'Perdu',        icon: '❌', color: '#ef4444', bg: '#fee2e2', border: '#ef4444' },
]

function statutBadge(statut) {
  if (statut === 'en_cours') return { label: '🔄 En cours', bg: '#fef3c7', color: '#92400e' }
  if (statut === 'termine')  return { label: '✅ Terminé',  bg: '#d1fae5', color: '#065f46' }
  return { label: statut, bg: '#f3f4f6', color: '#374151' }
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

// ─── PLV Card ────────────────────────────────────────────────────────────────
function PLVCard({ plv, onRetirer, onChangerEtat, onNote }) {
  const opt = ETAT_OPTIONS.find(o => o.value === plv.etat_retour) || ETAT_OPTIONS[0]

  return (
    <div style={{
      border: `2px solid ${opt.border}`,
      borderRadius: '0.75rem',
      background: 'white',
      overflow: 'hidden',
      transition: 'border-color 0.2s ease'
    }}>
      {/* En-tête */}
      <div style={{
        background: opt.bg,
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937' }}>
            {opt.icon} {plv.qr_code}
          </span>
          {plv.modele_nom && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
              — {plv.modele_nom}
            </span>
          )}
        </div>
        <button
          onClick={() => onRetirer(plv.id)}
          style={{
            background: '#fee2e2', color: '#991b1b', border: 'none',
            padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
            cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem'
          }}
        >
          Retirer
        </button>
      </div>

      {/* Sélecteur d'état */}
      <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {ETAT_OPTIONS.map(o => (
          <label key={o.value} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 0.875rem',
            border: `2px solid ${plv.etat_retour === o.value ? o.border : '#e5e7eb'}`,
            background: plv.etat_retour === o.value ? o.bg : 'white',
            borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500',
            fontSize: '0.875rem', transition: 'all 0.15s ease'
          }}>
            <input
              type="radio"
              name={`etat-${plv.id}`}
              checked={plv.etat_retour === o.value}
              onChange={() => onChangerEtat(plv.id, o.value)}
              style={{ display: 'none' }}
            />
            {o.icon} {o.label}
          </label>
        ))}
      </div>

      {/* Note visible si maintenance ou perdu */}
      {(plv.etat_retour === 'maintenance' || plv.etat_retour === 'perdu') && (
        <div style={{ padding: '0 1rem 0.75rem' }}>
          <input
            type="text"
            placeholder={plv.etat_retour === 'perdu' ? 'Circonstances de la perte...' : 'Décrivez le problème...'}
            value={plv.note || ''}
            onChange={(e) => onNote(plv.id, e.target.value)}
            style={{
              width: '100%', padding: '0.5rem 0.75rem',
              border: '2px solid #e5e7eb', borderRadius: '0.5rem',
              fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
function Retour() {
  const [etape, setEtape] = useState('selection') // 'selection' | 'scan'
  const [paniersSortis, setPaniersSortis] = useState([])
  const [panierSelectionne, setPanierSelectionne] = useState(null)
  const [plvsEvenement, setPlvsEvenement] = useState([])
  const [panierRetour, setPanierRetour] = useState([])

  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState(null)
  const scannerRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [rechercheEvent, setRechercheEvent] = useState('')

  useEffect(() => {
    fetchPaniersSortis()
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
      }
    }
  }, [])

  async function fetchPaniersSortis() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('paniers')
        .select(`
          *,
          panier_plv (
            id, plv_id, etat_sortie, etat_retour, date_retour,
            plv:plv_id (
              id, qr_code, statut,
              modeles_plv (nom, type)
            )
          )
        `)
        .eq('statut', 'en_cours')
        .order('date_depot_prevue', { ascending: false })

      if (error) throw error
      setPaniersSortis(data || [])
    } catch {
      toast.error('Erreur lors du chargement des événements')
    } finally {
      setLoading(false)
    }
  }

  function selectionnerPanier(panier) {
    const plvsSorties = (panier.panier_plv || [])
      .filter(pp => !pp.date_retour && pp.plv?.statut === 'sorti')
      .map(pp => pp.plv)

    setPanierSelectionne(panier)
    setPlvsEvenement(plvsSorties)
    setPanierRetour([])
    setEtape('scan')
  }

  // ── Scanner ──────────────────────────────────────────────────────────────
  const onScanSuccess = (qrCode) => {
    const plv = plvsEvenement.find(p => p.qr_code === qrCode)
    if (!plv) {
      toast.error(`❌ ${qrCode} non trouvée dans cet événement`)
      return
    }
    if (panierRetour.find(p => p.id === plv.id)) {
      toast('Déjà scannée', { icon: '⚠️' })
      return
    }
    setPanierRetour(prev => [...prev, {
      ...plv,
      modele_nom: plv.modeles_plv?.nom,
      etat_retour: 'bon',
      note: ''
    }])
    toast.success(`✅ ${qrCode} ajoutée`)
  }

  const startScan = () => {
    setScanning(true)
    setTimeout(() => {
      const cfg = {
        fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0,
        videoConstraints: { facingMode: { ideal: 'environment' } }
      }
      const sc = new Html5QrcodeScanner('qr-reader-retour', cfg, false)
      sc.render(
        (decoded) => { onScanSuccess(decoded); stopScan() },
        (err) => { if (!err.includes('NotFoundException')) console.error(err) }
      )
      setScanner(sc)
      scannerRef.current = sc
    }, 100)
  }

  const stopScan = () => {
    if (scanner) {
      scanner.clear().catch(() => {})
      setScanning(false)
      setScanner(null)
    }
  }

  const toutAjouter = () => {
    const nonScannees = plvsEvenement.filter(plv => !panierRetour.find(p => p.id === plv.id))
    if (nonScannees.length === 0) { toast('Toutes déjà ajoutées', { icon: 'ℹ️' }); return }
    setPanierRetour(prev => [
      ...prev,
      ...nonScannees.map(plv => ({
        ...plv, modele_nom: plv.modeles_plv?.nom, etat_retour: 'bon', note: ''
      }))
    ])
    toast.success(`✅ ${nonScannees.length} PLV(s) ajoutées`)
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const validerRetour = async () => {
    if (panierRetour.length === 0) { toast.error('Aucune PLV à retourner'); return }
    const t = toast.loading('Enregistrement...')
    try {
      for (const plv of panierRetour) {
        const nouveauStatut = plv.etat_retour === 'maintenance' ? 'maintenance'
          : plv.etat_retour === 'perdu' ? 'perdu'
          : 'disponible'

        await supabase.from('plv').update({ statut: nouveauStatut }).eq('id', plv.id)
        await supabase.from('panier_plv')
          .update({
            date_retour: new Date().toISOString(),
            etat_retour: plv.etat_retour,
          })
          .eq('plv_id', plv.id)
          .is('date_retour', null)
      }

      // Auto-clôturer l'événement si toutes les PLVs sont retournées
      const toutesRetournees = plvsEvenement.every(p => panierRetour.find(pr => pr.id === p.id))
      if (toutesRetournees && panierSelectionne) {
        await supabase.from('paniers').update({ statut: 'termine' }).eq('id', panierSelectionne.id)
        toast.dismiss(t)
        toast.success('🎉 Événement clôturé — toutes les PLVs retournées !')
      } else {
        toast.dismiss(t)
        toast.success(`✅ Retour de ${panierRetour.length} PLV(s) enregistré`)
      }

      setPanierRetour([])
      setEtape('selection')
      setPanierSelectionne(null)
      setPlvsEvenement([])
      await fetchPaniersSortis()
    } catch (error) {
      toast.dismiss(t)
      toast.error('Erreur : ' + error.message)
    }
  }

  // ── Rendu ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner text="Chargement des événements..." />

  const paniersFiltres = paniersSortis.filter(p =>
    [p.nom_evenement, p.adresse, p.nom_prestataire].some(v =>
      v?.toLowerCase().includes(rechercheEvent.toLowerCase())
    )
  )

  const plvsRestantes = plvsEvenement.filter(p => !panierRetour.find(pr => pr.id === p.id))
  const progression = plvsEvenement.length > 0
    ? Math.round((panierRetour.length / plvsEvenement.length) * 100)
    : 0

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header + Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <span
              onClick={() => { stopScan(); setEtape('selection'); setPanierSelectionne(null) }}
              style={{ cursor: etape !== 'selection' ? 'pointer' : 'default', color: etape !== 'selection' ? '#667eea' : '#6b7280', textDecoration: etape !== 'selection' ? 'underline' : 'none' }}
            >
              Événements
            </span>
            {etape !== 'selection' && (
              <>
                <span>›</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>{panierSelectionne?.nom_evenement}</span>
              </>
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            ⬅️ {etape === 'selection' ? 'Retour de stock' : panierSelectionne?.nom_evenement}
          </h1>
        </div>
        {etape === 'selection' && (
          <div style={{ background: 'white', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
            <span style={{ fontWeight: '600', color: '#6b7280' }}>Événements en cours : </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{paniersSortis.length}</span>
          </div>
        )}
      </div>

      {/* ════════ ÉTAPE 1 — Sélection événement ════════ */}
      {etape === 'selection' && (
        <>
          {paniersSortis.length === 0 ? (
            <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
              <p style={{ fontSize: '1.125rem', color: '#6b7280', fontWeight: '600' }}>Aucun événement en cours</p>
              <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Les dispatches actifs apparaîtront ici</p>
            </div>
          ) : (
            <>
              {/* Recherche */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher un événement, adresse, prestataire..."
                  value={rechercheEvent}
                  onChange={(e) => setRechercheEvent(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem',
                    border: '2px solid #e5e7eb', borderRadius: '0.75rem',
                    fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box',
                    background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {paniersFiltres.map(panier => {
                  const total = panier.panier_plv?.length || 0
                  const retournees = panier.panier_plv?.filter(pp => pp.date_retour).length || 0
                  const pending = total - retournees
                  const pct = total > 0 ? Math.round((retournees / total) * 100) : 0
                  const badge = statutBadge(panier.statut)

                  return (
                    <div
                      key={panier.id}
                      onClick={() => selectionnerPanier(panier)}
                      style={{
                        background: 'white', border: '2px solid #e5e7eb',
                        borderRadius: '1rem', padding: '1.25rem 1.5rem',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <h3 style={{ fontWeight: '700', fontSize: '1.0625rem', color: '#1f2937', margin: 0 }}>
                              {panier.nom_evenement}
                            </h3>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: '#6b7280' }}>
                            {panier.adresse && <span>📍 {panier.adresse}</span>}
                            {panier.date_depot_prevue && <span>📅 {formatDate(panier.date_depot_prevue)}</span>}
                            {panier.nom_prestataire && <span>👤 {panier.nom_prestataire}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '110px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{retournees}/{total} retournées</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: pending > 0 ? '#f59e0b' : '#10b981' }}>{pending}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>en attente</div>
                        </div>
                      </div>
                      {/* Barre progression */}
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #667eea, #764ba2)',
                            borderRadius: '9999px', transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                          <span>{pct}% retourné</span>
                          <span>Cliquer pour retourner →</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ════════ ÉTAPE 2 — Scan + Panier ════════ */}
      {etape === 'scan' && panierSelectionne && (
        <>
          {/* Carte dispatch d'origine */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)',
            border: '2px solid #c7d2fe', borderRadius: '1rem', padding: '1.25rem 1.5rem'
          }}>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              📦 Dispatch d'origine
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: '700', color: '#1f2937', margin: 0, fontSize: '1.125rem' }}>{panierSelectionne.nom_evenement}</h3>
                {panierSelectionne.numero_evenement && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' }}>N° {panierSelectionne.numero_evenement}</p>}
                {panierSelectionne.adresse && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' }}>📍 {panierSelectionne.adresse}</p>}
                {panierSelectionne.date_recup_prevue && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' }}>🔄 Récup prévue : {formatDate(panierSelectionne.date_recup_prevue)}</p>}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
                {[
                  { val: plvsEvenement.length, label: 'Sorties', color: '#667eea' },
                  { val: panierRetour.length, label: 'Scannées', color: '#10b981' },
                  { val: plvsRestantes.length, label: 'Restantes', color: '#f59e0b' }
                ].map(({ val, label, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color }}>{val}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Progression */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ height: '8px', background: '#e0e7ff', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progression}%`,
                  background: progression === 100 ? '#10b981' : 'linear-gradient(90deg, #667eea, #764ba2)',
                  borderRadius: '9999px', transition: 'width 0.4s ease'
                }} />
              </div>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#6b7280', textAlign: 'right' }}>{progression}% retourné</p>
            </div>
          </div>

          {/* PLVs restantes (raccourcis clics) */}
          {plvsRestantes.length > 0 && (
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontWeight: '700', color: '#1f2937', margin: 0 }}>📋 À retourner ({plvsRestantes.length})</h3>
                <button
                  onClick={toutAjouter}
                  style={{ background: '#f0f4ff', color: '#667eea', border: '2px solid #c7d2fe', padding: '0.4rem 0.875rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                >
                  Tout ajouter
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {plvsRestantes.map(plv => (
                  <span
                    key={plv.id}
                    onClick={() => onScanSuccess(plv.qr_code)}
                    style={{
                      padding: '0.4rem 0.875rem', border: '2px solid #667eea',
                      borderRadius: '0.5rem', background: 'white', color: '#667eea',
                      fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer'
                    }}
                  >
                    {plv.qr_code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Boutons test (dev only) */}
          {config.features.testButtons && plvsEvenement.length > 0 && (
            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '0.75rem', border: '2px solid #fbbf24' }}>
              <p style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>🧪 Mode TEST</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {plvsEvenement.slice(0, 5).map(plv => (
                  <button key={plv.id} onClick={() => onScanSuccess(plv.qr_code)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                    {plv.qr_code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scanner */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937' }}>📱 Scanner un QR Code</h3>
            {!scanning ? (
              <>
                <button onClick={startScan} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
                  📷 Activer la caméra
                </button>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.75rem', textAlign: 'center' }}>
                  Ou cliquez directement sur un code PLV ci-dessus
                </p>
              </>
            ) : (
              <>
                <div id="qr-reader-retour" style={{ width: '100%', marginBottom: '1rem' }} />
                <button onClick={stopScan} className="btn btn-secondary" style={{ width: '100%' }}>✕ Arrêter le scan</button>
              </>
            )}
          </div>

          {/* Panier retour */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              PLVs à retourner
              <span style={{
                background: panierRetour.length > 0 ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e5e7eb',
                color: panierRetour.length > 0 ? 'white' : '#9ca3af',
                padding: '0.2rem 0.7rem', borderRadius: '9999px', fontSize: '0.875rem'
              }}>
                {panierRetour.length}
              </span>
            </h2>

            {panierRetour.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9ca3af' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📦</div>
                <p>Scannez ou cliquez sur une PLV pour commencer</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {panierRetour.map(plv => (
                  <PLVCard
                    key={plv.id}
                    plv={plv}
                    onRetirer={(id) => { setPanierRetour(prev => prev.filter(p => p.id !== id)); toast('PLV retirée', { icon: '🗑️' }) }}
                    onChangerEtat={(id, etat) => setPanierRetour(prev => prev.map(p => p.id === id ? { ...p, etat_retour: etat } : p))}
                    onNote={(id, note) => setPanierRetour(prev => prev.map(p => p.id === id ? { ...p, note } : p))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions bas de page */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingBottom: '1rem' }}>
            <button
              onClick={() => { stopScan(); setEtape('selection'); setPanierSelectionne(null) }}
              className="btn btn-secondary"
              style={{ flex: '0 0 auto' }}
            >
              ← Changer d'événement
            </button>
            <button
              onClick={validerRetour}
              className="btn btn-primary"
              disabled={panierRetour.length === 0}
              style={{
                flex: 1, fontSize: '1rem', padding: '0.875rem 2rem',
                opacity: panierRetour.length === 0 ? 0.5 : 1,
                cursor: panierRetour.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ✅ Valider le retour ({panierRetour.length} PLV{panierRetour.length > 1 ? 's' : ''})
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Retour
