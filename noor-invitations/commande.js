/* ============ Noor Invitations — commande en ligne ============
   Formules, options et liens de paiement Stripe.
   Paiement en une fois, à la commande : le client règle le total (formule + options).

   À CONFIGURER : créer dans Stripe un « lien de paiement » par montant à encaisser
   (Produits → Liens de paiement), avec comme page de confirmation :
   https://webatir.com/noor-invitations/commander/merci/
   - clé « formule » seule : la formule sans option (ex. signature → 190 €)
   - clé « formule+option+option » (options dans l'ordre de NOOR_OPTIONS) pour une combinaison précise
     (ex. 'signature+save-the-date' → 229 €)
   Si aucun lien ne correspond à la commande, le bouton de paiement ouvre WhatsApp avec le récapitulatif. */

const NOOR_PAYMENT_LINKS = {
  essentielle: '', // 99 €
  signature: '',   // 190 €
  prestige: '',    // 390 €
};

/* Adresse qui reçoit le récapitulatif de chaque commande (via FormSubmit) */
const NOOR_ORDER_EMAIL = 'contact@webatir.com';

const NOOR_FORMULAS = [
  { id: 'essentielle', name: 'Essentielle', price: 99, summary: "« Je veux celui-là » : le modèle tel quel, avec vos informations" },
  { id: 'signature', name: 'Signature', price: 190, summary: "« À notre image » : le modèle adapté à vos couleurs et à votre ambiance" },
  { id: 'prestige', name: 'Prestige', price: 390, summary: "« Quelque chose d'unique » : une création sur mesure, à partir de vos inspirations" },
];

const NOOR_OPTIONS = [
  { id: 'save-the-date', name: 'Save the date', price: 39 },
  { id: 'evenement', name: 'Événement supplémentaire', price: 60 },
  { id: 'langue', name: 'Deuxième langue', price: 40 },
  { id: 'express', name: 'Livraison express en 48 h', price: 40 },
];


/* Sections du faire-part : toutes incluses par défaut, le client peut en retirer à la commande */
const NOOR_SECTIONS = [
  { id: 'enveloppe', name: 'Enveloppe et cachet' },
  { id: 'accueil', name: "Mot d'accueil" },
  { id: 'portrait', name: 'Portrait du couple' },
  { id: 'compte-a-rebours', name: 'Compte à rebours' },
  { id: 'programme', name: 'Programme' },
  { id: 'lieu', name: 'Lieu et itinéraire' },
  { id: 'temoins', name: 'Contacts des témoins' },
  { id: 'rsvp', name: 'Réponses des invités' },
];

function noorEuros(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
}
