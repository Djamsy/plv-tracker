import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Modeles() {
  const [modeles, setModeles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nom: '',
    type: '',
    categorie: '',
    description: ''
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchModeles()
  }, [])

  async function fetchModeles() {
    try {
      const { data, error } = await supabase
        .from('modeles_plv')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setModeles(data || [])
    } catch (error) {
      console.error('Erreur:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.nom || !formData.type) {
      alert('Le nom et le type sont obligatoires !')
      return
    }

    try {
      if (editingId) {
        // Modification
        const { error } = await supabase
          .from('modeles_plv')
          .update(formData)
          .eq('id', editingId)
        
        if (error) throw error
        alert('✅ Modèle mis à jour !')
      } else {
        // Création
        const { error } = await supabase
          .from('modeles_plv')
          .insert([formData])
        
        if (error) throw error
        alert('✅ Modèle créé !')
      }

      // Réinitialiser
      setFormData({ nom: '', type: '', categorie: '', description: '' })
      setShowForm(false)
      setEditingId(null)
      fetchModeles()
    } catch (error) {
      alert('Erreur : ' + error.message)
    }
  }

  const handleEdit = (modele) => {
    setFormData({
      nom: modele.nom,
      type: modele.type,
      categorie: modele.categorie || '',
      description: modele.description || ''
    })
    setEditingId(modele.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce modèle ? Les exemplaires associés seront également supprimés.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('modeles_plv')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      alert('✅ Modèle supprimé !')
      fetchModeles()
    } catch (error) {
      alert('Erreur : ' + error.message)
    }
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ nom: '', type: '', categorie: '', description: '' })
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
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Gestion des modèles</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            {modeles.length} modèle{modeles.length > 1 ? 's' : ''} de PLV
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            ➕ Nouveau modèle
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
            {editingId ? '✏️ Modifier le modèle' : '➕ Nouveau modèle'}
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Nom du modèle *
              </label>
              <input
                type="text"
                placeholder="Ex: Kakemono Nike Air Max 2m"
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Sélectionner un type</option>
                  <option value="kakemono">Kakemono</option>
                  <option value="stop-rayon">Stop rayon</option>
                  <option value="présentoir">Présentoir</option>
                  <option value="totem">Totem</option>
                  <option value="vitrophanie">Vitrophanie</option>
                  <option value="autre">Autre</option>
                  <option value="Roll-up">Roll-up</option>
                  <option value="affiche">Affiche</option>
                  <option value="banderole">Banderole</option>
                </select>
              </div>

             <div>
  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
    Catégorie
  </label>
  <select
    value={formData.categorie}
    onChange={(e) => setFormData({...formData, categorie: e.target.value})}
    style={{
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e5e7eb',
      borderRadius: '0.5rem',
      fontSize: '1rem'
    }}
  >
    <option value="">Sélectionner une catégorie</option>
    <option value="Sport">Sport</option>
    <option value="Culture">Culture</option>
    <option value="Education">Éducation</option>
    <option value="Action Sociale">Action Sociale</option>
    <option value="Tourisme">Tourisme</option>
    <option value="Agriculture">Agriculture</option>
    <option value="Artisanat">Artisanat</option>
    <option value="Environnement">Environnement</option>
    <option value="Santé">Santé</option>
    <option value="Événementiel">Événementiel</option>
    <option value="Commerce">Commerce</option>
    <option value="Autre">Autre</option>
  </select>
</div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Description
              </label>
              <textarea
                placeholder="Ex: Kakemono enroulable 2m x 80cm avec housse de transport"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={handleSubmit} className="btn btn-primary">
                {editingId ? '✅ Enregistrer' : '➕ Créer le modèle'}
              </button>
              <button onClick={cancelForm} className="btn btn-secondary">
                ❌ Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des modèles */}
      {modeles.length === 0 ? (
        <div style={{ 
          background: 'white',
          padding: '4rem',
          borderRadius: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Aucun modèle
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Créez votre premier modèle de PLV pour commencer
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            ➕ Créer un modèle
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {modeles.map(modele => (
            <div 
              key={modele.id}
              style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '1rem',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                border: '2px solid #e5e7eb',
                transition: 'all 0.3s'
              }}
              className="stat-card"
            >
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', flex: 1 }}>
                    {modele.nom}
                  </h3>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: '#f3f4f6',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {modele.type}
                  </span>
                  {modele.categorie && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: '#e0e7ff',
                      color: '#4338ca',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      {modele.categorie}
                    </span>
                  )}
                </div>

                {modele.description && (
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    {modele.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => handleEdit(modele)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: '#e0e7ff',
                    color: '#4338ca',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Modifier
                </button>
                <button 
                  onClick={() => handleDelete(modele.id)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    cursor: 'pointer'
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
  )
}

export default Modeles