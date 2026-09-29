/* ============ Noor Invitations — commande en ligne ============
   Formules, options et liens de paiement Stripe.
   L'acompte payé à la commande = 50 % de la formule ; les options et le solde sont réglés à la mise en ligne.

   À CONFIGURER : créer dans Stripe un « lien de paiement » par acompte (Produits → Liens de paiement),
   avec comme page de confirmation : https://webatir.com/noor-invitations/commander/merci/
   puis coller chaque lien ci-dessous. Tant qu'un lien est vide, le bouton de paiement ouvre WhatsApp
   avec le récapitulatif de la commande. */

const NOOR_PAYMENT_LINKS = {
  essentielle: '', // acompte 49,50 €
  signature: '',   // acompte 95 €
  prestige: '',    // acompte 175 €
};

/* Adresse qui reçoit le récapitulatif de chaque commande (via FormSubmit) */
const NOOR_ORDER_EMAIL = 'contact@webatir.com';

const NOOR_FORMULAS = [
  { id: 'essentielle', name: 'Essentielle', price: 99, summary: 'Une collection, à vos couleurs' },
  { id: 'signature', name: 'Signature', price: 190, summary: 'Cachet à vos initiales, vidéo d\'ouverture, votre portrait' },
  { id: 'prestige', name: 'Prestige', price: 350, summary: 'Entièrement sur mesure, plusieurs événements' },
];

const NOOR_OPTIONS = [
  { id: 'save-the-date', name: 'Save the date', price: 39 },
  { id: 'evenement', name: 'Événement supplémentaire', price: 60 },
  { id: 'langue', name: 'Deuxième langue', price: 40 },
  { id: 'express', name: 'Livraison express en 48 h', price: 40 },
];

const NOOR_DEPOSIT_RATE = 0.5;

function noorEuros(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
}
