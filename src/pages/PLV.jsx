import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'

function PLV() {
  const [plvs, setPlvs] = useState([])
  const [modeles, setModeles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    qr_code: '',
    modele_id: '',
    statut: 'disponible'
  })
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtreModele, setFiltreModele] = useState('tous')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: plvsData, error: plvsError } = await supabase
        .from('plv')
        .select(`
          *,
          modeles_plv (nom, type, categorie)
        `)
        .order('qr_code')

      if (plvsError) throw plvsError

      const { data: modelesData, error: modelesError } = await supabase
        .from('modeles_plv')
        .select('*')
        .order('nom')

      if (modelesError) throw modelesError

      setPlvs(plvsData || [])
      setModeles(modelesData || [])
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.qr_code || !formData.modele_id) {
      toast.error('Remplis tous les champs obligatoires')
      return
    }

    const loadingToast = toast.loading(editingId ? 'Modification...' : 'Création...')

    try {
      if (editingId) {
        const { error } = await supabase
          .from('plv')
          .update({
            qr_code: formData.qr_code,
            modele_id: formData.modele_id,
            statut: formData.statut
          })
          .eq('id', editingId)

        if (error) throw error
        toast.dismiss(loadingToast)
        toast.success('✅ PLV modifiée')
      } else {
        const { error } = await supabase
          .from('plv')
          .insert({
            qr_code: formData.qr_code,
            modele_id: formData.modele_id,
            statut: formData.statut
          })

        if (error) {
          if (error.code === '23505') {
            toast.dismiss(loadingToast)
            toast.error('❌ Ce QR code existe déjà')
            return
          }
          throw error
        }
        toast.dismiss(loadingToast)
        toast.success('✅ PLV créée')
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({ qr_code: '', modele_id: '', statut: 'disponible' })
      fetchData()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Erreur : ' + error.message)
    }
  }

  const handleEdit = (plv) => {
    setEditingId(plv.id)
    setFormData({
      qr_code: plv.qr_code,
      modele_id: plv.modele_id,
      statut: plv.statut
    })
    setShowForm(true)
  }

  const handleDelete = async (id, qrCode) => {
    const confirmer = () => {
      toast((t) => (
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Supprimer {qrCode} ?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={async () => {
                toast.dismiss(t.id)
                const loadingToast = toast.loading('Suppression...')
                try {
                  const { error } = await supabase
                    .from('plv')
                    .delete()
                    .eq('id', id)

                  if (error) throw error
                  toast.dismiss(loadingToast)
                  toast.success('✅ PLV supprimée')
                  fetchData()
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
              Supprimer
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

  const plvsFiltrees = plvs.filter(plv => {
    if (filtreStatut !== 'tous' && plv.statut !== filtreStatut) return false
    if (filtreModele !== 'tous' && plv.modele_id !== parseInt(filtreModele)) return false
    return true
  })

  const getStatutBadge = (statut) => {
    const styles = {
      disponible: { bg: '#d1fae5', color: '#065f46' },
      sorti: { bg: '#fef3c7', color: '#92400e' },
      maintenance: { bg: '#fee2e2', color: '#991b1b' }
    }
    const style = styles[statut] || styles.disponible
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        fontWeight: '600'
      }}>
        {statut === 'disponible' ? '✅' : statut === 'sorti' ? '📦' : '🔧'} {statut}
      </span>
    )
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
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Gestion des PLV</h1>
        <button 
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setFormData({ qr_code: '', modele_id: '', statut: 'disponible' })
          }}
          className="btn btn-primary"
        >
          ➕ Créer une PLV
        </button>
      </div>

      {/* Filtres */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>🔍 Filtres</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
              Statut
            </label>
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem'
              }}
            >
              <option value="tous">Tous</option>
              <option value="disponible">Disponible</option>
              <option value="sorti">Sorti</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
              Modèle
            </label>
            <select
              value={filtreModele}
              onChange={(e) => setFiltreModele(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem'
              }}
            >
              <option value="tous">Tous</option>
              {modeles.map(m => (
                <option key={m.id} value={m.id}>{m.nom}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {editingId ? '✏️ Modifier PLV' : '➕ Créer une PLV'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                QR Code *
              </label>
              <input
                type="text"
                value={formData.qr_code}
                onChange={(e) => setFormData({...formData, qr_code: e.target.value})}
                placeholder="Ex: PLV042"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Modèle *
              </label>
              <select
                value={formData.modele_id}
                onChange={(e) => setFormData({...formData, modele_id: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
              >
                <option value="">-- Sélectionner --</option>
                {modeles.map(m => (
                  <option key={m.id} value={m.id}>{m.nom} ({m.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Statut
              </label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({...formData, statut: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
              >
                <option value="disponible">Disponible</option>
                <option value="sorti">Sorti</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId ? '✅ Modifier' : '➕ Créer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setFormData({ qr_code: '', modele_id: '', statut: 'disponible' })
                }}
                className="btn btn-secondary"
              >
                ❌ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des PLV */}
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            Liste des PLV 
            <span style={{
              marginLeft: '0.75rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.875rem'
            }}>
              {plvsFiltrees.length}
            </span>
          </h2>
        </div>

        {plvsFiltrees.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <p>Aucune PLV trouvée</p>
          </div>
        ) : (
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {plvsFiltrees.map(plv => (
              <div
                key={plv.id}
                style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  background: '#f9fafb'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <QRCodeSVG value={plv.qr_code} size={120} />
                </div>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                  {plv.qr_code}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  <strong>Modèle :</strong> {plv.modeles_plv?.nom}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  <strong>Type :</strong> {plv.modeles_plv?.type}
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  {getStatutBadge(plv.statut)}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(plv)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(plv.id, plv.qr_code)}
                    style={{
                      flex: 1,
                      background: '#fee2e2',
                      color: '#991b1b',
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PLV