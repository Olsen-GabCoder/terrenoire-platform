import { useEffect, useState } from 'react';
import { APP_BUILD_ID, fetchDeployedBuild } from '../utils/appVersion';
import '../styles/UpdateBanner.css';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Bandeau discret affiché quand une nouvelle version du site a été mise en
 * ligne depuis l'ouverture de l'onglet. Vérification au retour sur l'onglet
 * et toutes les 15 minutes ; uniquement sur le site construit (production).
 */
const UpdateBanner = () => {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || APP_BUILD_ID === 'dev') return undefined;
    let cancelled = false;

    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      const deployed = await fetchDeployedBuild();
      if (!cancelled && deployed && deployed.build !== APP_BUILD_ID) setAvailable(true);
    };

    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (!available || dismissed) return null;

  return (
    <div className="tn-update" role="status" aria-live="polite">
      <i className="fas fa-arrows-rotate tn-update__icon" aria-hidden="true" />
      <p className="tn-update__text">Une nouvelle version du site est disponible.</p>
      <button type="button" className="tn-update__reload" onClick={() => window.location.reload()}>
        Actualiser
      </button>
      <button type="button" className="tn-update__close" onClick={() => setDismissed(true)} aria-label="Masquer">
        <i className="fas fa-xmark" aria-hidden="true" />
      </button>
    </div>
  );
};

export default UpdateBanner;
