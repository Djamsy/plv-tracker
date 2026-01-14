import toast from 'react-hot-toast'

export const handleError = (error, customMessage = null) => {
  console.error('Error:', error)
  
  const message = customMessage || error.message || 'Une erreur est survenue'
  
  // Erreurs spécifiques Supabase
  if (error.code === 'PGRST116') {
    toast.error('Aucun résultat trouvé')
  } else if (error.code === '23505') {
    toast.error('Cette donnée existe déjà')
  } else if (error.code === '23503') {
    toast.error('Impossible de supprimer : des éléments sont liés')
  } else {
    toast.error(message)
  }
  
  return null
}

export const handleSuccess = (message) => {
  toast.success(message)
}