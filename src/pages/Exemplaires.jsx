import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Exemplaires() {
  const [modeles, setModeles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    modele_id: '',
    quantite: 1,
    prefix: 'PLV'
  })

  useEffect(() => {
    fetchModeles()
  }, [])

  async function fetchModeles() {
    try {
      const { data, error } = await supabase
        .from('modeles_plv')
        .select('*')
        .order('nom')
      
      if (error) throw error
      setModeles(data || [])
    } catch (error) {
      console.error('Erreur:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const genererProchainQRCode = async (prefix, index = 0) => {
    // Récupérer tous les QR codes avec ce préfixe
    const { data: plvs } = await supabase
      .from('plv')
      .select('qr_code')
      .like('qr_code', `${prefix}%`)
      .order('qr_code', { ascending: false })

    let maxNumber = 0
    if (plvs && plvs.length > 0) {
      // Extraire tous les numéros
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
      alert('Sélectionne un modèle !')
      return
    }

    if (formData.quantite < 1 || formData.quantite > 50) {
      alert('Quantité entre 1 et 50 !')
      return
    }

    try {
      const exemplaires = []
      
      // Générer les exemplaires
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

      alert(`✅ ${formData.quantite} exemplaire(s) créé(s) avec succès !`)
      setFormData({ modele_id: '', quantite: 1, prefix: 'PLV' })
      setShowForm(false)
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

  if (modeles.length === 0) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Créer des exemplaires</h1>
        <div style={{ 
          background: 'white',
          padding: '4rem',
          borderRadius: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Aucun modèle disponible
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Créez d'abord des modèles de PLV avant de générer des exemplaires
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Créer des exemplaires</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            Génération automatique de QR codes
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            ➕ Créer des exemplaires
          </button>
        )}
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
            ➕ Générer des exemplaires
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Modèle de PLV *
              </label>
              <select
                value={formData.modele_id}
                onChange={(e) => setFormData({...formData, modele_id: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Préfixe QR Code
                </label>
                <input
                  type="text"
                  placeholder="Ex: PLV, KAK, STOP..."
                  value={formData.prefix}
                  onChange={(e) => setFormData({...formData, prefix: e.target.value.toUpperCase()})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
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
                  onChange={(e) => setFormData({...formData, quantite: parseInt(e.target.value)})}
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

            <div style={{
              padding: '1rem',
              background: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: '0.5rem'
            }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#065f46' }}>
                💡 {formData.quantite} QR code(s) seront générés automatiquement
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={handleSubmit} className="btn btn-primary">
                ✅ Créer les exemplaires
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">
                ❌ Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        background: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
          📖 Comment ça marche ?
        </h3>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8', color: '#6b7280' }}>
          <li>Choisis un modèle de PLV existant</li>
          <li>Définis le préfixe des QR codes (ex: PLV, KAK, STOP...)</li>
          <li>Indique combien d'exemplaires tu veux créer</li>
          <li>Les QR codes seront générés automatiquement avec numérotation (PLV001, PLV002...)</li>
          <li>Retrouve tes QR codes dans la page "QR Codes" pour les imprimer</li>
        </ol>
      </div>
    </div>
  )
}

export default Exemplaires