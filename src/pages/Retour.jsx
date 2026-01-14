import { useState, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '../supabaseClient'

function Retour() {
  const [panierRetour, setPanierRetour] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState(null)
  const [plvsSorties, setPlvsSorties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlvsSorties()
  }, [])

  async function fetchPlvsSorties() {
    const { data, error } = await supabase
      .from('plv')
      .select('*')
      .eq('statut', 'sorti')
    
    if (error) {
      console.error('Erreur:', error)
      return
    }
    setPlvsSorties(data || [])
    setLoading(false)
  }

  const onScanSuccess = async (qrCode) => {
    const plv = plvsSorties.find(p => p.qr_code === qrCode)
    
    if (!plv) {
      alert('PLV non trouvée ou pas en statut "sorti" !')
      return
    }

    if (panierRetour.find(p => p.id === plv.id)) {
      alert('PLV déjà scannée pour retour !')
      return
    }

    setPanierRetour([...panierRetour, { ...plv, etat_retour: 'bon' }])
    alert(`PLV ajoutée au retour !`)
  }

  const testScan = (qrCode) => {
    onScanSuccess(qrCode)
  }

  const startScan = () => {
    setScanning(true)
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader-retour",
      { fps: 10, qrbox: 250 }
    )
    html5QrcodeScanner.render(onScanSuccess)
    setScanner(html5QrcodeScanner)
  }

  const stopScan = () => {
    if (scanner) {
      scanner.clear()
      setScanning(false)
    }
  }

  const retirerDuPanier = (id) => {
    setPanierRetour(panierRetour.filter(p => p.id !== id))
  }

  const changerEtat = (id, nouvelEtat) => {
    setPanierRetour(panierRetour.map(p => 
      p.id === id ? { ...p, etat_retour: nouvelEtat } : p
    ))
  }

  const validerRetour = async () => {
    if (panierRetour.length === 0) {
      alert('Aucune PLV à retourner !')
      return
    }

    try {
      for (const plv of panierRetour) {
        const nouveauStatut = plv.etat_retour === 'maintenance' ? 'maintenance' : 'disponible'
        
        await supabase
          .from('plv')
          .update({ statut: nouveauStatut })
          .eq('id', plv.id)

        await supabase
          .from('panier_plv')
          .update({ 
            date_retour: new Date().toISOString(),
            etat_retour: plv.etat_retour
          })
          .eq('plv_id', plv.id)
          .is('date_retour', null)
      }

      alert('✅ Retour enregistré !')
      setPanierRetour([])
      fetchPlvsSorties()
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

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Retour de stock</h1>
        <div style={{
          background: 'white',
          padding: '0.75rem 1.25rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontWeight: '600', color: '#6b7280' }}>PLV sorties : </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{plvsSorties.length}</span>
        </div>
      </div>

      {/* Boutons de test */}
      <div style={{ 
        background: '#fef3c7', 
        padding: '1rem', 
        borderRadius: '0.75rem',
        border: '2px solid #fbbf24'
      }}>
        <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>🧪 Mode TEST (sans caméra)</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => testScan('PLV001')} className="btn btn-secondary">Test PLV001</button>
          <button onClick={() => testScan('PLV002')} className="btn btn-secondary">Test PLV002</button>
          <button onClick={() => testScan('PLV003')} className="btn btn-secondary">Test PLV003</button>
        </div>
      </div>

      {/* Scanner */}
      <div style={{ 
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        {!scanning ? (
          <button onClick={startScan} className="btn btn-primary">
            📷 Scanner QR Code
          </button>
        ) : (
          <button onClick={stopScan} className="btn btn-secondary">
            ⏹ Arrêter le scan
          </button>
        )}
        {scanning && <div id="qr-reader-retour" style={{ marginTop: '1rem' }}></div>}
      </div>

      {/* Panier de retour */}
      <div style={{ 
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          PLV à retourner 
          <span style={{
            marginLeft: '0.75rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.875rem'
          }}>
            {panierRetour.length}
          </span>
        </h2>

        {panierRetour.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
            <p style={{ fontSize: '1.125rem' }}>Aucune PLV scannée pour retour</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {panierRetour.map(plv => (
              <div key={plv.id} style={{ 
                border: '2px solid #e5e7eb', 
                padding: '1.25rem', 
                borderRadius: '0.75rem',
                background: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{plv.qr_code}</h3>
                  </div>
                  <button 
                    onClick={() => retirerDuPanier(plv.id)}
                    style={{
                      background: '#fee2e2',
                      color: '#991b1b',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    ❌ Retirer
                  </button>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    État au retour :
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      border: plv.etat_retour === 'bon' ? '2px solid #10b981' : '2px solid #e5e7eb',
                      background: plv.etat_retour === 'bon' ? '#d1fae5' : 'white',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}>
                      <input 
                        type="radio" 
                        checked={plv.etat_retour === 'bon'}
                        onChange={() => changerEtat(plv.id, 'bon')}
                      />
                      ✅ Bon état
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      border: plv.etat_retour === 'maintenance' ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                      background: plv.etat_retour === 'maintenance' ? '#fef3c7' : 'white',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}>
                      <input 
                        type="radio"
                        checked={plv.etat_retour === 'maintenance'}
                        onChange={() => changerEtat(plv.id, 'maintenance')}
                      />
                      🔧 Maintenance
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      border: plv.etat_retour === 'perdu' ? '2px solid #ef4444' : '2px solid #e5e7eb',
                      background: plv.etat_retour === 'perdu' ? '#fee2e2' : 'white',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}>
                      <input 
                        type="radio"
                        checked={plv.etat_retour === 'perdu'}
                        onChange={() => changerEtat(plv.id, 'perdu')}
                      />
                      ❌ Perdu
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <button 
              onClick={validerRetour}
              className="btn btn-primary"
              style={{ 
                fontSize: '1.125rem',
                padding: '1rem 2rem',
                marginTop: '1rem'
              }}
            >
              ✅ Valider le retour
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Retour