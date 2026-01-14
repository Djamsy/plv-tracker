import jsPDF from 'jspdf'
import 'jspdf-autotable'

export const genererBonDeSortie = (panier, plvs) => {
  const doc = new jsPDF()
  
  // En-tête
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text('BON DE SORTIE PLV', 105, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, 105, 28, { align: 'center' })
  
  // Ligne de séparation
  doc.setLineWidth(0.5)
  doc.line(20, 35, 190, 35)
  
  // Informations événement
  let y = 45
  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text('INFORMATIONS ÉVÉNEMENT', 20, y)
  
  y += 10
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  
  const infos = [
    ['Nom événement :', panier.nom_evenement],
    ['N° événement :', panier.numero_evenement || '-'],
    ['Adresse :', panier.adresse],
    ['Date de dépôt :', panier.date_depot_prevue],
    ['Date de récupération :', panier.date_recup_prevue || '-'],
    ['Prestataire :', panier.nom_prestataire || '-']
  ]
  
  infos.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold')
    doc.text(label, 20, y)
    doc.setFont(undefined, 'normal')
    doc.text(value, 70, y)
    y += 7
  })
  
  // Liste des PLV
  y += 10
  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text('LISTE DES PLV', 20, y)
  
  y += 5
  
  // Tableau des PLV
  const tableData = plvs.map(plv => [
    plv.qr_code,
    plv.modele?.nom || 'Non assigné',
    plv.modele?.type || '-',
    plv.statut
  ])
  
  doc.autoTable({
    startY: y,
    head: [['QR Code', 'Modèle', 'Type', 'Statut']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 70 },
      2: { cellWidth: 40 },
      3: { cellWidth: 35 }
    }
  })
  
  // Récapitulatif
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text(`TOTAL : ${plvs.length} PLV`, 20, finalY)
  
  // Signatures
  const signY = finalY + 20
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  
  // Signature sortie
  doc.text('Signature sortie :', 20, signY)
  doc.rect(20, signY + 5, 70, 30)
  doc.setFontSize(9)
  doc.text('Date :', 20, signY + 40)
  doc.line(35, signY + 40, 90, signY + 40)
  
  // Signature retour
  doc.text('Signature retour :', 110, signY)
  doc.rect(110, signY + 5, 70, 30)
  doc.setFontSize(9)
  doc.text('Date :', 110, signY + 40)
  doc.line(125, signY + 40, 180, signY + 40)
  
  // Pied de page
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('PLV Tracker - Gestion de matériel publicitaire', 105, 285, { align: 'center' })
  
  // Sauvegarder
  const filename = `bon_sortie_${panier.nom_evenement.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}