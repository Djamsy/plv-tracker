import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Historique() {
  const [paniers, setPaniers] = useState([])
  const [stats, setStats] = useState({
    totalSorties: 0,
    totalRetours: 0,
    plvActives: 0,
    eventsEnCours: 0
  })
  const [loading, setLoading] = useState(true)
  const [filtres, setFiltres] = useState({
    dateDebut: '',
    dateFin: '',
    statut: 'tous'
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Récupérer tous les paniers avec leurs PLV
      const { data: paniersData, error: paniersError } = await supabase
        .from('paniers')
        .select(`
          *,
          panier_plv (
            id,
            plv_id,
            etat_sortie,
            etat_retour,
            date_retour,
            plv:plv_id (
              qr_code,
              modele:modeles_plv(nom, type)
            )
          )
        `)
        .order('created_at', { ascending: false })
      
      if (paniersError) throw paniersError

      // Calculer les stats
      const totalSorties = paniersData?.length || 0
      const totalRetours = paniersData?.filter(p => p.statut === 'termine').length || 0
      const eventsEnCours = paniersData?.filter(p => p.statut === 'en_cours').length || 0
      
      // Compter les PLV actives (en sortie)
      const { count: plvActivesCount } = await supabase
        .from('plv')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'sorti')

      setStats({
        totalSorties,
        totalRetours,
        plvActives: plvActivesCount || 0,
        eventsEnCours
      })

      setPaniers(paniersData || [])
    } catch (error) {
      console.error('Erreur:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const paniersFiltrés = paniers.filter(panier => {
    // Filtre par date
    if (filtres.dateDebut && panier.date_depot_prevue < filtres.dateDebut) return false
    if (filtres.dateFin && panier.date_depot_prevue > filtres.dateFin) return false
    
    // Filtre par statut
    if (filtres.statut !== 'tous' && panier.statut !== filtres.statut) return false
    
    return true
  })

  const exportCSV = () => {
    const headers = ['Date', 'Événement', 'N° Événement', 'Adresse', 'Statut', 'PLV', 'Prestataire']
    const rows = paniersFiltrés.map(panier => [
      panier.date_depot_prevue,
      panier.nom_evenement,
      panier.numero_evenement || '-',
      panier.adresse,
      panier.statut,
      panier.panier_plv?.length || 0,
      panier.nom_prestataire || '-'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historique_plv_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
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
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Historique & Rapports</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            Vue d'ensemble de toutes les sorties et retours
          </p>
        </div>
        <button onClick={exportCSV} className="btn btn-primary">
          📥 Export CSV
        </button>
      </div>

      {/* Stats globales */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total sorties</span>
            <span className="stat-icon">📦</span>
          </div>
          <div className="stat-value">{stats.totalSorties}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Événements terminés</span>
            <span className="stat-icon">✅</span>
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>{stats.totalRetours}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">En cours</span>
            <span className="stat-icon">🔄</span>
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.eventsEnCours}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">PLV actives</span>
            <span className="stat-icon">🏷️</span>
          </div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.plvActives}</div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ 
        background: 'white',
        padding: '1.5rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>🔍 Filtres</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Date début
            </label>
            <input
              type="date"
              value={filtres.dateDebut}
              onChange={(e) => setFiltres({...filtres, dateDebut: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Date fin
            </label>
            <input
              type="date"
              value={filtres.dateFin}
              onChange={(e) => setFiltres({...filtres, dateFin: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Statut
            </label>
            <select
              value={filtres.statut}
              onChange={(e) => setFiltres({...filtres, statut: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="tous">Tous</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={() => setFiltres({ dateDebut: '', dateFin: '', statut: 'tous' })}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              🔄 Réinitialiser
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
          {paniersFiltrés.length} résultat{paniersFiltrés.length > 1 ? 's' : ''} trouvé{paniersFiltrés.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Liste historique */}
      <div style={{ 
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>📋 Historique complet</h2>
        </div>

        {paniersFiltrés.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>Aucun résultat avec ces filtres</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#6b7280' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#6b7280' }}>Événement</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#6b7280' }}>Adresse</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#6b7280' }}>PLV</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#6b7280' }}>Statut</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#6b7280' }}>Prestataire</th>
                </tr>
              </thead>
              <tbody>
                {paniersFiltrés.map(panier => (
                  <tr key={panier.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {new Date(panier.date_depot_prevue).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600' }}>{panier.nom_evenement}</div>
                      {panier.numero_evenement && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>N° {panier.numero_evenement}</div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {panier.adresse}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#f3f4f6',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>
                        {panier.panier_plv?.length || 0}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: panier.statut === 'en_cours' ? '#fef3c7' : '#d1fae5',
                        color: panier.statut === 'en_cours' ? '#92400e' : '#065f46'
                      }}>
                        {panier.statut === 'en_cours' ? '🔄 En cours' : '✅ Terminé'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {panier.nom_prestataire || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Historique