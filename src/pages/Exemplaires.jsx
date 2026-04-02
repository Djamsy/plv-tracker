import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

function Exemplaires() {
  const [modeles, setModeles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [formData, setFormData] = useState({
    modele_id: '',
    quantite: 1,
    prefix: 'PLV'
  })
  const navigate = useNavigate()

  useEffect(() => {
    fetchModeles()
  }, [])

  async function fetchModeles() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('modeles_plv')
        .select('*')
        .order('nom')
      
      if (error) throw error
      setModeles(data || [])
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const genererProchainQRCode = async (prefix, index = 0) => {
    const { data: plvs } = await supabase
      .from('plv')
      .select('qr_code')
      .like('qr_code', `${prefix}%`)
      .order('qr_code', { ascending: false })

    let maxNumber = 0
    if (plvs && plvs.length > 0) {
      plvs.forEach(plv => {
        const match = plv.qr_code.match(/\d+$/)
        if (match) {
          const num = parseInt(match[0])
          if (num > maxNumber) maxNumber = num
        }
      })
    }

    return `${prefix}${String(maxNumber + 1 + index).padStart(3, '0')}`
  }

  const handleSubmit = async () => {
    if (!formData.modele_id) {
      toast.error('Sélectionne un modèle !')
      return
    }

    if (formData.quantite < 1 || formData.quantite > 50) {
      toast.error('Quantité entre 1 et 50 !')
      return
    }

    setGenerating(true)
    const loadingToast = toast.loading(`Génération de ${formData.quantite} exemplaire(s)...`)

    try {
      const exemplaires = []
      
      for (let i = 0; i < formData.quantite; i++) {
        const qrCode = await genererProchainQRCode(formData.prefix, i)
        exemplaires.push({
          modele_id: formData.modele_id,
          qr_code: qrCode,
          statut: 'disponible'
        })
      }

      const { error } = await supabase
        .from('plv')
        .insert(exemplaires)
      
      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success(`✅ ${formData.quantite} exemplaire(s) créé(s) avec succès !`)
      
      setFormData({ modele_id: '', quantite: 1, prefix: 'PLV' })
      setShowForm(false)
      
      // Proposer de voir les QR codes
      setTimeout(() => {
        toast((t) => (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Voir les QR codes ?
            </p>
            <button
              onClick={() => {
                toast.dismiss(t.id)
                navigate('/qrcodes')
              }}
              style={{
                background: '#667eea',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                width: '100%'
              }}
            >
              📱 Voir les QR codes
            </button>
          </div>
        ), { duration: 5000 })
      }, 500)
      
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Erreur : ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Chargement des modèles..." />
  }

  if (modeles.length === 0) {
    return (
      <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Créer des exemplaires</h1>
        <EmptyState
          icon="📦"
          title="Aucun modèle disponible"
          description="Créez d'abord des modèles de PLV avant de générer des exemplaires"
          action={{
            label: "➕ Créer un modèle",
            onClick: () => navigate('/modeles')
          }}
        />
      </div>
    )
  }

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Créer des exemplaires</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            Génération automatique de QR codes séquentiels
          </p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="btn btn-primary hover-grow"
          >
            ➕ Créer des exemplaires
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="animate-slideInUp" style={{ 
          background: 'white',
          padding: '2rem', 
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            ➕ Générer des exemplaires
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="stagger-item">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Modèle de PLV *
              </label>
              <select
                value={formData.modele_id}
                onChange={(e) => setFormData({...formData, modele_id: e.target.value})}
                disabled={generating}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  opacity: generating ? 0.6 : 1
                }}
              >
                <option value="">Sélectionner un modèle</option>
                {modeles.map(modele => (
                  <option key={modele.id} value={modele.id}>
                    {modele.nom} ({modele.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="stagger-item" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', animationDelay: '0.05s' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Préfixe QR Code
                </label>
                <input
                  type="text"
                  placeholder="Ex: PLV, KAK, STOP..."
                  value={formData.prefix}
                  onChange={(e) => setFormData({...formData, prefix: e.target.value.toUpperCase()})}
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    cursor: generating ? 'not-allowed' : 'text',
                    opacity: generating ? 0.6 : 1
                  }}
                />
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Les numéros seront ajoutés automatiquement (ex: PLV001, PLV002...)
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Quantité *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.quantite}
                  onChange={(e) => setFormData({...formData, quantite: parseInt(e.target.value) || 1})}
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    cursor: generating ? 'not-allowed' : 'text',
                    opacity: generating ? 0.6 : 1
                  }}
                />
              </div>
            </div>

            <div className="stagger-item" style={{
              padding: '1rem',
              background: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: '0.5rem',
              animationDelay: '0.1s'
            }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#065f46' }}>
                💡 {formData.quantite} QR code(s) seront générés automatiquement avec numérotation séquentielle
              </p>
            </div>

            <div className="stagger-item" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', animationDelay: '0.15s' }}>
              <button 
                onClick={handleSubmit} 
                disabled={generating}
                className={`btn btn-primary hover-grow ${generating ? 'btn-loading' : ''}`}
                style={{ flex: 1 }}
              >
                {generating ? '' : '✅ Créer les exemplaires'}
              </button>
              <button 
                onClick={() => setShowForm(false)} 
                disabled={generating}
                className="btn btn-secondary hover-grow"
                style={{ 
                  opacity: generating ? 0.6 : 1,
                  cursor: generating ? 'not-allowed' : 'pointer'
                }}
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats card */}
      <div className="animate-slideInUp" style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {modeles.slice(0, 4).map((modele, index) => (
          <div 
            key={modele.id}
            className="stat-card hover-lift stagger-item"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="stat-card-header">
              <span className="stat-label">{modele.nom}</span>
              <span className="stat-icon">
                {modele.type === 'kakemono' ? '🎏' : 
                 modele.type === 'stop-rayon' ? '🛑' :
                 modele.type === 'presentoir' ? '📦' :
                 modele.type === 'totem' ? '🗿' :
                 modele.type === 'vitrophanie' ? '🪟' : '📋'}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              {modele.type}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="animate-slideInUp" style={{ 
        background: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
          📖 Comment ça marche ?
        </h3>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: '2', color: '#6b7280' }}>
          <li className="stagger-item">Choisis un modèle de PLV existant</li>
          <li className="stagger-item" style={{ animationDelay: '0.05s' }}>Définis le préfixe des QR codes (ex: PLV, KAK, STOP...)</li>
          <li className="stagger-item" style={{ animationDelay: '0.1s' }}>Indique combien d'exemplaires tu veux créer</li>
          <li className="stagger-item" style={{ animationDelay: '0.15s' }}>Les QR codes seront générés automatiquement avec numérotation (PLV001, PLV002...)</li>
          <li className="stagger-item" style={{ animationDelay: '0.2s' }}>Retrouve tes QR codes dans la page "QR Codes" pour les imprimer</li>
        </ol>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#fef3c7',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>💡</span>
          <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
            <strong>Astuce :</strong> Utilise des préfixes différents pour chaque type de PLV (ex: KAK pour kakemonos, STOP pour stop-rayons)
          </p>
        </div>
      </div>
    </div>
  )
}

export default Exemplaires