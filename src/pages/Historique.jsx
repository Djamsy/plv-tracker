import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import toast from 'react-hot-toast'

function Historique() {
  const [paniers, setPaniers]   = useState([])
  const [stats, setStats]       = useState({ total: 0, termines: 0, enCours: 0, plvActives: 0 })
  const [loading, setLoading]   = useState(true)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin]     = useState('')
  const [statut, setStatut]       = useState('tous')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [{ data: paniersData }, { count: plvActives }] = await Promise.all([
        supabase.from('paniers').select(`
          *,
          panier_plv(id, plv_id, etat_sortie, etat_retour, date_retour,
            plv:plv_id(qr_code, modele:modeles_plv(nom, type)))
        `).order('created_at', { ascending: false }),
        supabase.from('plv').select('*', { count: 'exact', head: true }).eq('statut', 'sorti'),
      ])

      const data = paniersData || []
      setStats({
        total:     data.length,
        termines:  data.filter(p => p.statut === 'termine').length,
        enCours:   data.filter(p => p.statut === 'en_cours').length,
        plvActives: plvActives || 0,
      })
      setPaniers(data)
    } catch {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const filtrés = useMemo(() => paniers.filter(p => {
    if (dateDebut && p.date_depot_prevue < dateDebut) return false
    if (dateFin   && p.date_depot_prevue > dateFin)   return false
    if (statut !== 'tous' && p.statut !== statut)      return false
    return true
  }), [paniers, dateDebut, dateFin, statut])

  const resetFiltres = () => { setDateDebut(''); setDateFin(''); setStatut('tous') }

  const exportCSV = () => {
    const t = toast.loading('Génération CSV...')
    try {
      const headers = ['Date', 'Événement', 'N° Évén.', 'Adresse', 'Statut', 'PLV', 'Prestataire']
      const rows = filtrés.map(p => [
        p.date_depot_prevue,
        p.nom_evenement,
        p.numero_evenement || '-',
        p.adresse,
        p.statut,
        p.panier_plv?.length || 0,
        p.nom_prestataire || '-',
      ])
      const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      link.download = `historique_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      toast.dismiss(t)
      toast.success(`✅ ${filtrés.length} événement${filtrés.length !== 1 ? 's' : ''} exporté${filtrés.length !== 1 ? 's' : ''}`)
    } catch {
      toast.dismiss(t)
      toast.error("Erreur lors de l'export")
    }
  }

  if (loading) return <LoadingSpinner text="Chargement de l'historique..." />

  const hasFilter = dateDebut || dateFin || statut !== 'tous'

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Historique & Rapports</h1>
          <p>Vue d'ensemble de toutes les sorties et retours</p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={exportCSV}
            disabled={filtrés.length === 0}
            className="btn btn-primary hover-grow"
            style={{ opacity: filtrés.length === 0 ? 0.55 : 1, cursor: filtrés.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total sorties',    value: stats.total,     icon: '📦', color: 'var(--gray-900)' },
          { label: 'Terminés',         value: stats.termines,  icon: '✅', color: 'var(--success)'  },
          { label: 'En cours',         value: stats.enCours,   icon: '🔄', color: 'var(--warning)'  },
          { label: 'PLV encore sorties', value: stats.plvActives, icon: '🏷️', color: 'var(--primary)' },
        ].map((s, i) => (
          <div key={s.label} className="stat-card stagger-item hover-lift" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="stat-card-header">
              <span className="stat-label">{s.label}</span>
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div className="filter-bar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '140px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Début</label>
          <input
            type="date"
            value={dateDebut}
            onChange={e => setDateDebut(e.target.value)}
            className="filter-input"
            style={{ minWidth: 0 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '140px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fin</label>
          <input
            type="date"
            value={dateFin}
            onChange={e => setDateFin(e.target.value)}
            className="filter-input"
            style={{ minWidth: 0 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Statut</label>
          <select value={statut} onChange={e => setStatut(e.target.value)} className="filter-select">
            <option value="tous">Tous</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
          </select>
        </div>
        {hasFilter && (
          <button onClick={resetFiltres} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-end' }}>
            ✕ Effacer
          </button>
        )}
        <span className="filter-count" style={{ alignSelf: 'flex-end' }}>
          {filtrés.length} résultat{filtrés.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table / Cards ── */}
      <div className="card animate-slideInUp">
        <div className="card-header">
          <h2>📋 Historique complet</h2>
          <span className="badge badge-neutral">{filtrés.length}</span>
        </div>

        {filtrés.length === 0 ? (
          <div className="card-body">
            <EmptyState
              icon="📭"
              title="Aucun résultat"
              description={paniers.length === 0 ? 'Créez votre premier événement depuis la page Sortie' : 'Modifiez les filtres pour voir des résultats'}
              action={paniers.length === 0 ? { label: 'Créer un événement', onClick: () => window.location.href = '/sortie' } : hasFilter ? { label: 'Effacer les filtres', onClick: resetFiltres } : null}
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="table-wrapper" style={{ display: 'none' }} id="hist-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Événement</th>
                    <th>Adresse</th>
                    <th className="td-center">PLV</th>
                    <th className="td-center">Statut</th>
                    <th>Prestataire</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrés.map(p => (
                    <tr key={p.id} className="stagger-item">
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(p.date_depot_prevue).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <div className="td-primary">{p.nom_evenement}</div>
                        {p.numero_evenement && <div className="td-secondary">N° {p.numero_evenement}</div>}
                      </td>
                      <td style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{p.adresse}</td>
                      <td className="td-center">
                        <span className="badge badge-neutral">{p.panier_plv?.length || 0}</span>
                      </td>
                      <td className="td-center">
                        <span className={`badge ${p.statut === 'en_cours' ? 'badge-warning' : 'badge-success'}`}>
                          {p.statut === 'en_cours' ? '🔄 En cours' : '✅ Terminé'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{p.nom_prestataire || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile + universal card list */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtrés.map((p, i) => (
                <div
                  key={p.id}
                  className="stagger-item"
                  style={{
                    padding: '1rem',
                    border: '1.5px solid var(--gray-200)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--gray-50)',
                    animationDelay: `${i * 0.03}s`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>
                      {p.nom_evenement}
                    </div>
                    {p.numero_evenement && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginBottom: '0.25rem' }}>
                        N° {p.numero_evenement}
                      </div>
                    )}
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span>📅 {new Date(p.date_depot_prevue).toLocaleDateString('fr-FR')}</span>
                      <span>📍 {p.adresse}</span>
                      {p.nom_prestataire && <span>👤 {p.nom_prestataire}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                    <span className={`badge ${p.statut === 'en_cours' ? 'badge-warning' : 'badge-success'}`}>
                      {p.statut === 'en_cours' ? '🔄 En cours' : '✅ Terminé'}
                    </span>
                    <span className="badge badge-neutral">{p.panier_plv?.length || 0} PLV</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Historique
