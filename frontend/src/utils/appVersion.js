/* global __APP_VERSION__, __APP_COMMIT__, __APP_BUILD_ID__ */
// Valeurs injectées par Vite au build (voir vite.config.js).
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : '';
export const APP_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

const RELOAD_KEY = 'tn_version_reload_at';
const RELOAD_GUARD_MS = 30_000;

/**
 * Recharge la page une seule fois quand un fichier du site est introuvable
 * (cas typique : une nouvelle version a été mise en ligne pendant que
 * l'onglet était ouvert). Renvoie false si un rechargement vient déjà
 * d'avoir lieu, pour ne jamais boucler.
 */
export function reloadOnceForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Stockage indisponible (navigation privée stricte) : on recharge quand même
  }
  window.location.reload();
  return true;
}

/** Erreur de chargement d'un morceau du site (page chargée à la demande). */
export function isChunkLoadError(error) {
  const msg = String(error?.message || error || '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS|ChunkLoadError/i.test(msg);
}

/** Interroge /version.json (jamais mis en cache) ; null en cas d'échec. */
export async function fetchDeployedBuild() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.build === 'string' ? data : null;
  } catch {
    return null;
  }
}
