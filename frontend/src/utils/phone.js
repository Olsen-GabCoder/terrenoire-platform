/**
 * Numéros de téléphone gabonais.
 *
 * Plan de numérotation (ARCEP, 9 chiffres obligatoires depuis le 6 avril 2024) :
 * - en local : 0 + 8 chiffres, affiché « 074 30 16 39 » ;
 * - en international : +241 + 8 chiffres (le 0 disparaît), « +241 74 30 16 39 » ;
 * - mobiles Airtel : 074, 076, 077 — Moov : 060 à 066 — fixe : 011.
 *
 * Stockage : E.164 (+24174301639). Paiement Bamboo : format local (074301639).
 */

const MOBILE_RE = /^0(6[0-6]|7[467])\d{6}$/;
const ANY_GABON_RE = /^0(11|6[0-6]|7[467])\d{6}$/;

/** Ramène toute saisie (« +241 74… », « 24174… », « 74301639 », « 074 30 16 39 ») au format local à 9 chiffres. */
export function toLocalGabon(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00241')) digits = digits.slice(5);
  else if (digits.startsWith('241') && digits.length >= 11) digits = digits.slice(3);
  if (digits.length === 8 && !digits.startsWith('0')) digits = `0${digits}`;
  return digits;
}

export const isGabonMobile = (value) => MOBILE_RE.test(toLocalGabon(value));
export const isGabonNumber = (value) => ANY_GABON_RE.test(toLocalGabon(value));

/** Opérateur Mobile Money déduit du préfixe (pas de portabilité au Gabon). */
export function detectOperator(value) {
  const local = toLocalGabon(value);
  if (/^07[467]/.test(local)) return 'airtel_money';
  if (/^06[0-6]/.test(local)) return 'moov_money';
  return null;
}

/** +24174301639 (stockage) ; chaîne vide si le numéro n'est pas gabonais valide. */
export function toE164(value) {
  const local = toLocalGabon(value);
  return ANY_GABON_RE.test(local) ? `+241${local.slice(1)}` : '';
}

/** Mise en forme pendant la saisie : « 074 30 16 39 ». */
export function formatLocalTyping(value) {
  const d = toLocalGabon(value).slice(0, 9);
  return [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

/** Affichage lisible d'un numéro enregistré : « +241 74 30 16 39 » (ou tel quel s'il n'est pas gabonais). */
export function formatPhoneDisplay(value) {
  if (!value) return '';
  const local = toLocalGabon(value);
  if (!ANY_GABON_RE.test(local)) return String(value);
  const n = local.slice(1);
  return `+241 ${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6, 8)}`;
}

/** Lien tel: */
export const phoneHref = (value) => {
  const e164 = toE164(value);
  return e164 ? `tel:${e164}` : `tel:${String(value || '').replace(/[^\d+]/g, '')}`;
};

/** Numéro étranger saisi au format international (+33…, +237…) : conservé tel quel. */
const isForeignInternational = (value) => {
  const raw = String(value || '').trim();
  return raw.startsWith('+') && !raw.replace(/\s/g, '').startsWith('+241');
};

/**
 * Message d'erreur pour un champ téléphone, ou '' si valide.
 * options.mobileOnly : exige un mobile gabonais (paiement Mobile Money).
 * options.allowForeign : accepte un numéro international étranger (+33…).
 */
export function validatePhone(value, { required = false, mobileOnly = false, allowForeign = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return required ? 'Le numéro de téléphone est requis.' : '';
  if (allowForeign && isForeignInternational(raw)) {
    return /^\+[1-9]\d{7,14}$/.test(raw.replace(/[\s.-]/g, '')) ? '' : 'Numéro international invalide (ex. +33 6 12 34 56 78).';
  }
  const local = toLocalGabon(raw);
  if (local.length !== 9) return 'Le numéro doit comporter 9 chiffres (ex. 074 30 16 39).';
  if (mobileOnly ? !MOBILE_RE.test(local) : !ANY_GABON_RE.test(local)) {
    return mobileOnly
      ? 'Saisissez un numéro mobile Airtel (074, 076, 077) ou Moov (060 à 066).'
      : 'Numéro gabonais invalide (ex. 074 30 16 39).';
  }
  return '';
}

/** Valeur à envoyer à l'API : E.164 pour un numéro gabonais, international nettoyé sinon. */
export function phoneForApi(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (isForeignInternational(raw)) return raw.replace(/[\s.-]/g, '');
  return toE164(raw) || raw.replace(/[\s.-]/g, '');
}

/** Valeur affichée dans un champ de saisie à partir d'une valeur enregistrée. */
export function phoneForInput(value) {
  if (!value) return '';
  if (isForeignInternational(value)) return String(value);
  return formatLocalTyping(value);
}

/** Mise en forme pendant la frappe (laisse passer les numéros internationaux étrangers). */
export function formatPhoneTyping(value) {
  const raw = String(value || '');
  if (isForeignInternational(raw)) return raw.replace(/[^\d+\s]/g, '');
  return formatLocalTyping(raw);
}
