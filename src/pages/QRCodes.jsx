import { useState, useEffect, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

const STATUTS = {
  disponible: { label: 'Disponible', cls: 'badge-success' },
  sorti:      { label: 'Sorti',      cls: 'badge-warning' },
  maintenance:{ label: 'Maintenance', cls: 'badge-danger' },
  perdu:      { label: 'Perdu',      cls: 'badge-neutral' },
}

function QRCodes() {
  const [exemplaires, setExemplaires] = useState([])
  const [modeles, setModeles]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtreModele, setFiltreModele] = useState('tous')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [{ data: exemplairesData }, { data: modelesData }] = await Promise.all([
        supabase.from('plv').select('*').order('qr_code'),
        supabase.from('modeles_plv').select('*').order('nom'),
      ])

      const enrichis = (exemplairesData || []).map(ex => ({
        ...ex,
        modele: (modelesData || []).find(m => m.id === ex.modele_id) || null,
      }))

      setExemplaires(enrichis)
      setModeles(modelesData || [])
    } catch (err) {
      console.error('Erreur:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtrés = useMemo(() => {
    const q = search.toLowerCase().trim()
    return exemplaires.filter(ex => {
      if (filtreStatut !== 'tous' && ex.statut !== filtreStatut) return false
      if (filtreModele !== 'tous' && ex.modele_id !== filtreModele) return false
      if (q && !ex.qr_code.toLowerCase().includes(q) && !ex.modele?.nom?.toLowerCase().includes(q)) return false
      return true
    })
  }, [exemplaires, search, filtreStatut, filtreModele])

  const resetFiltres = () => { setSearch(''); setFiltreStatut('tous'); setFiltreModele('tous') }

  if (loading) return <LoadingSpinner text="Chargement des QR Codes..." />

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>QR Codes PLV</h1>
          <p>{exemplaires.length} exemplaire{exemplaires.length !== 1 ? 's' : ''} · {modeles.length} modèle{modeles.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-header-actions">
          <button onClick={() => window.print()} className="btn btn-secondary hover-grow">
            🖨️ Imprimer
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <input
          className="filter-input"
          placeholder="🔍 Rechercher un QR code ou modèle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
          <option value="tous">Tous les statuts</option>
          <option value="disponible">✅ Disponible</option>
          <option value="sorti">📦 Sorti</option>
          <option value="maintenance">🔧 Maintenance</option>
          <option value="perdu">❌ Perdu</option>
        </select>
        {modeles.length > 0 && (
          <select className="filter-select" value={filtreModele} onChange={e => setFiltreModele(e.target.value)}>
            <option value="tous">Tous les modèles</option>
            {modeles.map(m => (
              <option key={m.id} value={m.id}>{m.nom}</option>
            ))}
          </select>
        )}
        {(search || filtreStatut !== 'tous' || filtreModele !== 'tous') && (
          <button onClick={resetFiltres} className="btn btn-secondary btn-sm">
            ✕ Effacer
          </button>
        )}
        <span className="filter-count">{filtrés.length} résultat{filtrés.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Grid ── */}
      {exemplaires.length === 0 ? (
        <EmptyState
          icon="📱"
          title="Aucun exemplaire"
          description="Créez des modèles et des exemplaires pour générer des QR codes"
        />
      ) : filtrés.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Aucun résultat"
          description="Modifiez les filtres pour trouver ce que vous cherchez"
          action={{ label: 'Effacer les filtres', onClick: resetFiltres }}
        />
      ) : (
        <div
          className="qr-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filtrés.map((ex, i) => {
            const statut = STATUTS[ex.statut] || { label: ex.statut, cls: 'badge-neutral' }
            return (
              <div
                key={ex.id}
                className="card qr-card stagger-item hover-lift"
                style={{ animationDelay: `${i * 0.03}s`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}
              >
                {/* Status badge */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                  <span className={`badge ${statut.cls}`}>{statut.label}</span>
                </div>

                {/* QR Code */}
                <div style={{
                  padding: '0.875rem',
                  background: 'white',
                  borderRadius: '0.75rem',
                  border: '2px solid var(--gray-200)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <QRCodeSVG value={ex.qr_code} size={160} level="H" includeMargin={false} />
                </div>

                {/* Info */}
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '0.02em' }}>
                    {ex.qr_code}
                  </div>
                  {ex.modele ? (
                    <>
                      <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                        {ex.modele.nom}
                      </div>
                      <span className="badge badge-neutral" style={{ marginTop: '0.5rem' }}>
                        {ex.modele.type}
                      </span>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--danger)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                      ⚠️ Modèle non trouvé
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default QRCodes
