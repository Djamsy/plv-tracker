import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import toast from 'react-hot-toast'

function Modeles() {
  const [modeles, setModeles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('modeles_plv')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setModeles(data || [])
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.nom || !formData.type) {
      toast.error('Le nom et le type sont obligatoires !')
      return
    }

    setSubmitting(true)
    const loadingToast = toast.loading(editingId ? 'Mise à jour...' : 'Création...')

    try {
      if (editingId) {
        const { error } = await supabase
          .from('modeles_plv')
          .update(formData)
          .eq('id', editingId)
        
        if (error) throw error
        toast.dismiss(loadingToast)
        toast.success('✅ Modèle mis à jour !')
      } else {
        const { error } = await supabase
          .from('modeles_plv')
          .insert([formData])
        
        if (error) throw error
        toast.dismiss(loadingToast)
        toast.success('✅ Modèle créé !')
      }

      setFormData({ nom: '', type: '', categorie: '', description: '' })
      setShowForm(false)
      setEditingId(null)
      fetchModeles()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Erreur : ' + error.message)
    } finally {
      setSubmitting(false)
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

  const handleDelete = async (id, nom) => {
    toast((t) => (
      <div>
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Supprimer "{nom}" ?
        </p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
          Les exemplaires associés seront également supprimés.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={async () => {
              toast.dismiss(t.id)
              const loadingToast = toast.loading('Suppression...')
              try {
                const { error } = await supabase
                  .from('modeles_plv')
                  .delete()
                  .eq('id', id)
                
                if (error) throw error
                toast.dismiss(loadingToast)
                toast.success('✅ Modèle supprimé !')
                fetchModeles()
              } catch (error) {
                toast.dismiss(loadingToast)
                toast.error('Erreur : ' + error.message)
              }
            }}
            style={{
              flex: 1,
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
              flex: 1,
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

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ nom: '', type: '', categorie: '', description: '' })
  }

  const getTypeIcon = (type) => {
    const icons = {
      'kakemono': '🎏',
      'stop-rayon': '🛑',
      'présentoir': '📦',
      'totem': '🗿',
      'vitrophanie': '🪟',
      'Roll-up': '📜',
      'affiche': '🖼️',
      'banderole': '🎌',
      'autre': '📋'
    }
    return icons[type] || '📋'
  }

  if (loading) {
    return <LoadingSpinner text="Chargement des modèles..." />
  }

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Modèles de PLV</h1>
          <p>{modeles.length} modèle{modeles.length !== 1 ? 's' : ''} enregistré{modeles.length !== 1 ? 's' : ''}</p>
        </div>
        {!showForm && (
          <div className="page-header-actions">
            <button onClick={() => setShowForm(true)} className="btn btn-primary hover-grow">
              ➕ Nouveau modèle
            </button>
          </div>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="card animate-slideInUp">
          <div className="card-header">
            <h2>{editingId ? '✏️ Modifier le modèle' : '➕ Nouveau modèle'}</h2>
          </div>
          <div className="card-body">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group stagger-item">
              <label className="form-label">Nom du modèle *</label>
              <input
                type="text"
                placeholder="Ex: Kakemono Nike Air Max 2m"
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                disabled={submitting}
                className="form-input"
              />
            </div>

            <div className="form-grid-2 stagger-item" style={{ animationDelay: '0.05s' }}>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  disabled={submitting}
                  className="form-input"
                >
                  <option value="">Sélectionner un type</option>
                  <option value="kakemono">🎏 Kakemono</option>
                  <option value="stop-rayon">🛑 Stop rayon</option>
                  <option value="présentoir">📦 Présentoir</option>
                  <option value="totem">🗿 Totem</option>
                  <option value="vitrophanie">🪟 Vitrophanie</option>
                  <option value="Roll-up">📜 Roll-up</option>
                  <option value="affiche">🖼️ Affiche</option>
                  <option value="banderole">🎌 Banderole</option>
                  <option value="autre">📋 Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select
                  value={formData.categorie}
                  onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                  disabled={submitting}
                  className="form-input"
                >
                  <option value="">Sélectionner une catégorie</option>
                  <option value="Sport">🏃 Sport</option>
                  <option value="Culture">🎭 Culture</option>
                  <option value="Education">📚 Éducation</option>
                  <option value="Action Sociale">🤝 Action Sociale</option>
                  <option value="Tourisme">✈️ Tourisme</option>
                  <option value="Agriculture">🌾 Agriculture</option>
                  <option value="Artisanat">🛠️ Artisanat</option>
                  <option value="Environnement">🌍 Environnement</option>
                  <option value="Santé">🏥 Santé</option>
                  <option value="Événementiel">🎪 Événementiel</option>
                  <option value="Commerce">🛒 Commerce</option>
                  <option value="Autre">📋 Autre</option>
                </select>
              </div>
            </div>

            <div className="form-group stagger-item" style={{ animationDelay: '0.1s' }}>
              <label className="form-label">Description</label>
              <textarea
                placeholder="Ex: Kakemono enroulable 2m x 80cm avec housse de transport"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                disabled={submitting}
                rows={3}
                className="form-input"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="stagger-item" style={{ display: 'flex', gap: '0.75rem', animationDelay: '0.15s' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`btn btn-primary hover-grow ${submitting ? 'btn-loading' : ''}`}
                style={{ flex: 1 }}
              >
                {submitting ? '' : editingId ? '✅ Enregistrer' : '➕ Créer le modèle'}
              </button>
              <button
                onClick={cancelForm}
                disabled={submitting}
                className="btn btn-secondary hover-grow"
              >
                Annuler
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Liste des modèles */}
      {modeles.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Aucun modèle"
          description="Créez votre premier modèle de PLV pour commencer"
          action={{
            label: "➕ Créer un modèle",
            onClick: () => setShowForm(true)
          }}
        />
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {modeles.map((modele, index) => (
            <div 
              key={modele.id}
              className="card-interactive hover-lift stagger-item"
              style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '1rem',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                border: '2px solid #e5e7eb',
                animationDelay: `${index * 0.05}s`
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '2rem' }}>{getTypeIcon(modele.type)}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
                      {modele.nom}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                  </div>
                </div>

                {modele.description && (
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280',
                    lineHeight: '1.5',
                    marginTop: '0.75rem'
                  }}>
                    {modele.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => handleEdit(modele)}
                  className="hover-grow"
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
                  onClick={() => handleDelete(modele.id, modele.nom)}
                  className="hover-grow"
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