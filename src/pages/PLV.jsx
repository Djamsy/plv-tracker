import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import LoadingSpinner from '../components/LoadingSpinner'

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUTS = {
  disponible:  { label: 'Disponible',  icon: '✅', bg: '#d1fae5', color: '#065f46' },
  sorti:       { label: 'En dispatch', icon: '📦', bg: '#fef3c7', color: '#92400e' },
  maintenance: { label: 'Maintenance', icon: '🔧', bg: '#fee2e2', color: '#991b1b' },
  perdu:       { label: 'Perdu',       icon: '❌', bg: '#f3f4f6', color: '#374151' },
}

function StatutBadge({ statut }) {
  const s = STATUTS[statut] || STATUTS.disponible
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '0.2rem 0.65rem', borderRadius: '9999px',
      fontSize: '0.8125rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
    }}>
      {s.icon} {s.label}
    </span>
  )
}

// ── Modal création/édition ───────────────────────────────────────────────────
function PLVModal({ modeles, editingPlv, onClose, onSaved }) {
  const isEdit = Boolean(editingPlv)
  const [mode, setMode] = useState(isEdit ? 'unitaire' : 'unitaire') // 'unitaire' | 'lot'
  const [form, setForm] = useState({
    qr_code:   editingPlv?.qr_code   || '',
    modele_id: editingPlv?.modele_id ? String(editingPlv.modele_id) : '',
    statut:    editingPlv?.statut    || 'disponible',
  })
  const [lot, setLot] = useState({ modele_id: '', prefix: 'PLV', quantite: 5 })
  const [saving, setSaving] = useState(false)

  // Auto-générer le prochain code QR quand le modèle change (mode unitaire)
  const genererCode = async (prefix) => {
    const { data } = await supabase
      .from('plv').select('qr_code').like('qr_code', `${prefix}%`).order('qr_code', { ascending: false })
    let max = 0
    data?.forEach(p => {
      const m = p.qr_code.match(/(\d+)$/)
      if (m && parseInt(m[1]) > max) max = parseInt(m[1])
    })
    return `${prefix}${String(max + 1).padStart(3, '0')}`
  }

  const handlePrefixBlur = async () => {
    if (!isEdit && form.qr_code === '' && lot.prefix) {
      const code = await genererCode(lot.prefix)
      setForm(f => ({ ...f, qr_code: code }))
    }
  }

  // ── Sauvegarde unitaire ──────────────────────────────────────────────────
  const saveUnitaire = async () => {
    if (!form.qr_code || !form.modele_id) { toast.error('Remplis le code et le modèle'); return }
    setSaving(true)
    const t = toast.loading(isEdit ? 'Modification...' : 'Création...')
    try {
      if (isEdit) {
        const { error } = await supabase.from('plv').update({
          qr_code: form.qr_code, modele_id: form.modele_id, statut: form.statut
        }).eq('id', editingPlv.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('plv').insert({
          qr_code: form.qr_code, modele_id: form.modele_id, statut: 'disponible'
        })
        if (error) {
          if (error.code === '23505') { toast.dismiss(t); toast.error('Ce code QR existe déjà'); return }
          throw error
        }
      }
      toast.dismiss(t)
      toast.success(isEdit ? '✅ PLV modifiée' : '✅ PLV créée')
      onSaved()
    } catch (err) {
      toast.dismiss(t)
      toast.error('Erreur : ' + err.message)
    } finally { setSaving(false) }
  }

  // ── Sauvegarde en lot ────────────────────────────────────────────────────
  const saveLot = async () => {
    if (!lot.modele_id) { toast.error('Sélectionne un modèle'); return }
    if (lot.quantite < 1 || lot.quantite > 100) { toast.error('Quantité entre 1 et 100'); return }
    setSaving(true)
    const t = toast.loading(`Génération de ${lot.quantite} PLV...`)
    try {
      const rows = []
      for (let i = 0; i < lot.quantite; i++) {
        const code = await genererCode(lot.prefix)
        // On incrémente localement pour éviter N requêtes
        const num = parseInt(code.replace(lot.prefix, '')) + i
        rows.push({
          qr_code:   `${lot.prefix}${String(num).padStart(3, '0')}`,
          modele_id: lot.modele_id,
          statut:    'disponible'
        })
      }
      // On recalcule proprement pour éviter les doublons
      const { data: existing } = await supabase.from('plv').select('qr_code').like('qr_code', `${lot.prefix}%`)
      let maxNum = 0
      existing?.forEach(p => {
        const m = p.qr_code.match(/(\d+)$/)
        if (m && parseInt(m[1]) > maxNum) maxNum = parseInt(m[1])
      })
      const inserts = Array.from({ length: lot.quantite }, (_, i) => ({
        qr_code:   `${lot.prefix}${String(maxNum + 1 + i).padStart(3, '0')}`,
        modele_id: parseInt(lot.modele_id),
        statut:    'disponible'
      }))
      const { error } = await supabase.from('plv').insert(inserts)
      if (error) throw error
      toast.dismiss(t)
      toast.success(`🎉 ${lot.quantite} PLV créées (${inserts[0].qr_code} → ${inserts[inserts.length - 1].qr_code})`)
      onSaved()
    } catch (err) {
      toast.dismiss(t)
      toast.error('Erreur : ' + err.message)
    } finally { setSaving(false) }
  }

  const inp = (val, onChange, placeholder, type = 'text') => (
    <input
      type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: '100%', padding: '0.65rem 0.875rem',
        border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)',
        fontSize: '0.9375rem', outline: 'none', background: 'white'
      }}
      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
      onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; if (placeholder === 'Ex: PLV') handlePrefixBlur() }}
    />
  )

  const sel = (val, onChange, children) => (
    <select
      value={val} onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '0.65rem 0.875rem',
        border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)',
        fontSize: '0.9375rem', background: 'white', outline: 'none', cursor: 'pointer'
      }}
      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
      onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
    >
      {children}
    </select>
  )

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(480px, 95vw)', background: 'white',
        borderRadius: '1.25rem', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        zIndex: 501, overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header modal */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: '800', fontSize: '1.125rem', color: 'var(--gray-900)' }}>
            {isEdit ? '✏️ Modifier PLV' : '➕ Créer des PLV'}
          </h2>
          <button onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Onglets mode (uniquement en création) */}
        {!isEdit && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
            {[['unitaire', '1 PLV'], ['lot', 'En lot']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '0.75rem', border: 'none', cursor: 'pointer',
                fontWeight: mode === m ? '700' : '500',
                color: mode === m ? 'var(--primary)' : 'var(--gray-400)',
                background: 'white',
                borderBottom: mode === m ? '2px solid var(--primary)' : '2px solid transparent',
                fontSize: '0.9375rem', transition: 'all 0.15s'
              }}>
                {label}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* ── Mode unitaire ── */}
          {(mode === 'unitaire' || isEdit) && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--gray-700)' }}>Code QR *</label>
                {inp(form.qr_code, v => setForm(f => ({...f, qr_code: v})), 'Ex: PLV042')}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--gray-700)' }}>Modèle *</label>
                {sel(form.modele_id, v => setForm(f => ({...f, modele_id: v})),
                  <><option value="">-- Sélectionner --</option>{modeles.map(m => <option key={m.id} value={m.id}>{m.nom} — {m.type}</option>)}</>
                )}
              </div>
              {isEdit && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--gray-700)' }}>Statut</label>
                  {sel(form.statut, v => setForm(f => ({...f, statut: v})),
                    Object.entries(STATUTS).map(([k, s]) => <option key={k} value={k}>{s.icon} {s.label}</option>)
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Mode lot ── */}
          {mode === 'lot' && !isEdit && (
            <>
              <div style={{ background: 'var(--primary-light)', borderRadius: '0.75rem', padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--primary)' }}>
                💡 Les codes seront auto-générés : <strong>{lot.prefix}001, {lot.prefix}002…</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--gray-700)' }}>Préfixe</label>
                  {inp(lot.prefix, v => setLot(l => ({...l, prefix: v.toUpperCase()})), 'Ex: PLV')}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--gray-700)' }}>Quantité</label>
                  {inp(lot.quantite, v => setLot(l => ({...l, quantite: Math.max(1, Math.min(100, parseInt(v) || 1))})), '5', 'number')}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--gray-700)' }}>Modèle *</label>
                {sel(lot.modele_id, v => setLot(l => ({...l, modele_id: v})),
                  <><option value="">-- Sélectionner --</option>{modeles.map(m => <option key={m.id} value={m.id}>{m.nom} — {m.type}</option>)}</>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: '0 0 auto' }} disabled={saving}>Annuler</button>
            <button
              onClick={mode === 'lot' && !isEdit ? saveLot : saveUnitaire}
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? '⏳ En cours...' : isEdit ? '✅ Enregistrer' : mode === 'lot' ? `🎉 Créer ${lot.quantite} PLV` : '✅ Créer'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page principale PLV ───────────────────────────────────────────────────────
function PLV() {
  const [plvs,          setPlvs]          = useState([])
  const [modeles,       setModeles]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [editingPlv,    setEditingPlv]    = useState(null)
  const [search,        setSearch]        = useState('')
  const [filtreStatut,  setFiltreStatut]  = useState('tous')
  const [filtreModele,  setFiltreModele]  = useState('tous')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [{ data: plvsData }, { data: modelesData }] = await Promise.all([
        supabase.from('plv').select('*, modeles_plv(nom, type, categorie)').order('qr_code'),
        supabase.from('modeles_plv').select('*').order('nom'),
      ])
      setPlvs(plvsData || [])
      setModeles(modelesData || [])
    } catch { toast.error('Erreur lors du chargement') }
    finally  { setLoading(false) }
  }

  const openCreate = () => { setEditingPlv(null); setShowModal(true) }
  const openEdit   = (plv) => { setEditingPlv(plv); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditingPlv(null) }
  const onSaved    = () => { closeModal(); fetchData() }

  const handleDelete = async (id, qrCode) => {
    toast((t) => (
      <div>
        <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Supprimer {qrCode} ?</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={async () => {
            toast.dismiss(t.id)
            const lt = toast.loading('Suppression...')
            try {
              await supabase.from('plv').delete().eq('id', id)
              toast.dismiss(lt); toast.success('🗑️ PLV supprimée'); fetchData()
            } catch (err) { toast.dismiss(lt); toast.error('Erreur : ' + err.message) }
          }} style={{ background: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
            Supprimer
          </button>
          <button onClick={() => toast.dismiss(t.id)} style={{ background: 'var(--gray-200)', color: 'var(--gray-700)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
            Annuler
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const plvsFiltrees = plvs.filter(plv => {
    if (filtreStatut !== 'tous' && plv.statut !== filtreStatut) return false
    if (filtreModele !== 'tous' && String(plv.modele_id) !== filtreModele) return false
    if (search && !plv.qr_code.toLowerCase().includes(search.toLowerCase()) &&
        !plv.modeles_plv?.nom?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return <LoadingSpinner text="Chargement des PLV..." />

  const stats = {
    total:       plvs.length,
    disponibles: plvs.filter(p => p.statut === 'disponible').length,
    sortis:      plvs.filter(p => p.statut === 'sorti').length,
    maintenance: plvs.filter(p => p.statut === 'maintenance').length,
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Modal */}
      {showModal && <PLVModal modeles={modeles} editingPlv={editingPlv} onClose={closeModal} onSaved={onSaved} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>Gestion des PLV</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '0.2rem' }}>{stats.total} exemplaires au total</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          ➕ Créer des PLV
        </button>
      </div>

      {/* Mini stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'Total',       value: stats.total,       color: 'var(--gray-900)' },
          { label: 'Disponibles', value: stats.disponibles, color: '#10b981' },
          { label: 'En dispatch', value: stats.sortis,      color: '#f59e0b' },
          { label: 'Maintenance', value: stats.maintenance, color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'white', borderRadius: '1rem', padding: '0.875rem 1rem',
            border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)'
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: '800', color, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Barre de filtres */}
      <div style={{ background: 'white', borderRadius: '1rem', padding: '1rem 1.25rem', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Recherche */}
        <div style={{ flex: '1 1 200px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}>🔍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un code ou modèle..."
            style={{
              width: '100%', padding: '0.6rem 0.875rem 0.6rem 2.25rem',
              border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)',
              fontSize: '0.875rem', outline: 'none'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
          />
        </div>

        {/* Filtre statut */}
        <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
          style={{ padding: '0.6rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: 'white', cursor: 'pointer', outline: 'none' }}>
          <option value="tous">Tous statuts</option>
          <option value="disponible">✅ Disponible</option>
          <option value="sorti">📦 En dispatch</option>
          <option value="maintenance">🔧 Maintenance</option>
          <option value="perdu">❌ Perdu</option>
        </select>

        {/* Filtre modèle */}
        <select value={filtreModele} onChange={e => setFiltreModele(e.target.value)}
          style={{ padding: '0.6rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: 'white', cursor: 'pointer', outline: 'none' }}>
          <option value="tous">Tous modèles</option>
          {modeles.map(m => <option key={m.id} value={String(m.id)}>{m.nom}</option>)}
        </select>

        {(search || filtreStatut !== 'tous' || filtreModele !== 'tous') && (
          <button onClick={() => { setSearch(''); setFiltreStatut('tous'); setFiltreModele('tous') }}
            style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 'var(--radius)', padding: '0.6rem 0.875rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: '600' }}>
            Réinitialiser
          </button>
        )}

        <span style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {plvsFiltrees.length} résultat{plvsFiltrees.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grille PLV */}
      {plvsFiltrees.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '1rem', padding: '4rem', textAlign: 'center', border: '1px solid var(--gray-100)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏷️</div>
          <p style={{ fontWeight: '700', color: 'var(--gray-700)', fontSize: '1.125rem' }}>Aucune PLV trouvée</p>
          <p style={{ color: 'var(--gray-400)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            {plvs.length === 0 ? 'Commencez par créer vos premières PLV' : 'Modifiez les filtres pour voir plus de résultats'}
          </p>
          {plvs.length === 0 && (
            <button onClick={openCreate} className="btn btn-primary">➕ Créer mes premières PLV</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {plvsFiltrees.map(plv => (
            <div key={plv.id} className="hover-lift" style={{
              background: 'white', border: '1.5px solid var(--gray-100)',
              borderRadius: '1rem', padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: '0.875rem',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s ease'
            }}>
              {/* QR Code centré */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
                <div style={{ background: 'var(--gray-50)', borderRadius: '0.75rem', padding: '0.75rem' }}>
                  <QRCodeSVG value={plv.qr_code} size={100} level="M" />
                </div>
              </div>

              {/* Infos */}
              <div>
                <p style={{ fontWeight: '800', fontSize: '1.0625rem', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>{plv.qr_code}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.125rem' }}>{plv.modeles_plv?.nom}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{plv.modeles_plv?.type}</p>
              </div>

              <StatutBadge statut={plv.statut} />

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button onClick={() => openEdit(plv)} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8125rem', padding: '0.5rem' }}>
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => handleDelete(plv.id, plv.qr_code)}
                  style={{ padding: '0.5rem 0.75rem', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PLV
