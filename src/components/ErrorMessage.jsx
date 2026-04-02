function ErrorMessage({ message, onRetry }) {
  return (
    <div style={{
      background: '#fee2e2',
      border: '2px solid #fecaca',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      margin: '1rem 0'
    }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
        <div style={{ fontSize: '1.5rem' }}>⚠️</div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontWeight: 'bold',
            color: '#991b1b',
            marginBottom: '0.5rem'
          }}>
            Une erreur est survenue
          </h3>
          <p style={{ color: '#7f1d1d', fontSize: '0.875rem' }}>
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
            >
              🔄 Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage