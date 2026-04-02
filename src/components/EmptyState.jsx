function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      color: '#9ca3af'
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '1rem',
        animation: 'bounce 2s infinite'
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: '0.5rem'
      }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-primary"
        >
          {action.label}
        </button>
      )}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}

export default EmptyState
