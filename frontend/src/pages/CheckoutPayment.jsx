import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import '../styles/CheckoutPayment.css';

const OPERATOR_LABELS = {
  moov_money: 'Moov Money',
  airtel_money: 'Airtel Money',
};

function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone || '';
  const d = phone.replace(/\D/g, '');
  if (d.length < 4) return d;
  return d.slice(0, 2) + 'X XXX ' + d.slice(-2);
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + '\u00a0FCFA';
}

const CheckoutPayment = () => {
  const { bambooRef } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, authChecked } = useAuth();

  const { orderId, operator, phone, amount } = location.state || {};

  const storedOrderId = orderId || sessionStorage.getItem('current_order_id');
  const storedRef = bambooRef || sessionStorage.getItem('current_payment_ref');

  const POLLING_MAX_MS = 15 * 60 * 1000; // 15 minutes
  const pollingStartedAt = useRef(Date.now());

  const [status, setStatus] = useState('PENDING');
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [redirectCount, setRedirectCount] = useState(3);

  // Auth guard
  // Auth guard (après vérification de la session : un F5 ne doit pas interrompre le suivi)
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigate('/login', { state: { from: location.pathname + location.search } });
    }
  }, [authChecked, isAuthenticated, navigate, location.pathname, location.search]);

  // Polling
  useEffect(() => {
    if (!storedRef) return;
    let cancelled = false;
    let timer;

    async function poll() {
      if (cancelled) return;

      // Timeout absolu : apres 15 min, arreter le polling
      if (Date.now() - pollingStartedAt.current > POLLING_MAX_MS) {
        setStatus('TIMEOUT');
        return;
      }

      try {
        const result = await orderService.checkPaymentStatus(storedRef);
        if (cancelled) return;

        const s = result.status;
        if (s === 'SUCCESS' || s === 'FAILED' || s === 'EXPIRED') {
          setStatus(s);
          return; // stop polling
        }
        setStatus('PENDING');
        timer = setTimeout(poll, 5000);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setStatus('ERROR');
          return;
        }
        // Network error — retry
        timer = setTimeout(poll, 5000);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [storedRef]);

  // Elapsed timer (only while PENDING)
  useEffect(() => {
    if (status !== 'PENDING') return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Auto-redirect on SUCCESS
  useEffect(() => {
    if (status !== 'SUCCESS') return;
    if (redirectCount <= 0) {
      sessionStorage.removeItem('current_payment_ref');
      navigate('/order-success', {
        state: { orderId: Number(storedOrderId) },
      });
      return;
    }
    const t = setTimeout(() => setRedirectCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, redirectCount, navigate, storedOrderId]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(storedRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = storedRef;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [storedRef]);

  const handleRetry = () => {
    sessionStorage.removeItem('current_payment_ref');
    navigate(storedOrderId ? `/checkout?retry=${storedOrderId}` : '/checkout');
  };

  const handleCancel = () => {
    sessionStorage.removeItem('current_payment_ref');
    sessionStorage.removeItem('current_order_id');
    navigate('/orders');
  };

  const handleGoToOrder = () => {
    sessionStorage.removeItem('current_payment_ref');
    navigate('/order-success', {
      state: { orderId: Number(storedOrderId) },
    });
  };

  // No ref at all
  if (!storedRef) {
    return (
      <div className="cpay-page">
        <div className="cpay-hero">
          <div className="cpay-hero__orb" />
          <div className="cpay-hero__line" />
          <h1 className="cpay-hero__title">Paiement introuvable</h1>
        </div>
        <div className="cpay-hero-fade" />
        <div className="cpay-body">
          <div className="cpay-icon cpay-icon--failed">
            <i className="fas fa-xmark" />
          </div>
          <h2 className="cpay-heading">Aucune transaction en cours</h2>
          <p className="cpay-desc">
            Nous n&apos;avons trouvé aucune référence de paiement.
            Si vous venez de passer commande, consultez vos commandes.
          </p>
          <div className="cpay-actions">
            <button className="cpay-btn cpay-btn--primary" onClick={() => navigate('/orders')}>
              Voir mes commandes <i className="fas fa-arrow-right" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const operatorLabel = OPERATOR_LABELS[operator] || operator || 'Mobile Money';
  const maskedPhone = maskPhone(phone);

  // ═══ HERO ═══
  const heroTitles = {
    PENDING: 'Paiement en cours',
    SUCCESS: 'Paiement confirmé',
    FAILED: 'Paiement non abouti',
    EXPIRED: 'Délai dépassé',
    TIMEOUT: 'Vérification en attente',
    ERROR: 'Erreur de vérification',
  };

  return (
    <div className="cpay-page">
      <section className="cpay-hero">
        <div className="cpay-hero__orb" />
        <div className="cpay-hero__line" />
        <h1 className="cpay-hero__title">{heroTitles[status] || heroTitles.PENDING}</h1>
      </section>
      <div className="cpay-hero-fade" />

      <div className="cpay-body">

        {/* ═══ PENDING ═══ */}
        {status === 'PENDING' && (
          <>
            <div className="cpay-spinner" aria-label="Vérification en cours">
              <div className="cpay-spinner__bar" />
              <div className="cpay-spinner__bar" />
              <div className="cpay-spinner__bar" />
              <div className="cpay-spinner__bar" />
              <div className="cpay-spinner__bar" />
            </div>

            <span className="cpay-tag cpay-tag--pending">Paiement en cours</span>
            <h2 className="cpay-heading">En attente de votre validation</h2>
            <p className="cpay-desc">
              Vérifiez votre téléphone et saisissez votre code PIN
              pour confirmer le paiement sur <strong>{operatorLabel}</strong>.
            </p>

            <div className="cpay-info">
              {amount && (
                <div className="cpay-info-row">
                  <span className="cpay-info-label">Montant</span>
                  <span className="cpay-info-value">{formatPrice(amount)}</span>
                </div>
              )}
              <div className="cpay-info-row">
                <span className="cpay-info-label">Opérateur</span>
                <span className="cpay-info-value">{operatorLabel}</span>
              </div>
              {maskedPhone && (
                <div className="cpay-info-row">
                  <span className="cpay-info-label">Numéro</span>
                  <span className="cpay-info-value">{maskedPhone}</span>
                </div>
              )}
              <div className="cpay-info-row">
                <span className="cpay-info-label">Référence</span>
                <span className="cpay-info-value">
                  {storedRef}
                  <button className="cpay-copy" onClick={handleCopy} title="Copier la référence">
                    <i className={copied ? 'fas fa-check' : 'far fa-copy'} />
                  </button>
                </span>
              </div>
            </div>

            <div className="cpay-timer">
              <i className="far fa-clock" />
              Temps écoulé :
              <span className="cpay-timer-value">{formatElapsed(elapsed)}</span>
            </div>
            <p className="cpay-expire-note">
              Le paiement expire après 10 minutes sans confirmation.
            </p>

            <div className="cpay-actions">
              <button className="cpay-btn cpay-btn--ghost" onClick={handleCancel}>
                Annuler le paiement
              </button>
            </div>
          </>
        )}

        {/* ═══ SUCCESS ═══ */}
        {status === 'SUCCESS' && (
          <>
            <div className="cpay-icon cpay-icon--success">
              <i className="fas fa-check" />
            </div>

            <span className="cpay-tag cpay-tag--success">Paiement confirmé</span>
            <h2 className="cpay-heading">Votre paiement a trouvé son chemin</h2>
            <p className="cpay-desc">
              Votre commande a été validée. Nous vous redirigeons
              vers votre page de confirmation.
            </p>

            <div className="cpay-info">
              <div className="cpay-info-row">
                <span className="cpay-info-label">Référence</span>
                <span className="cpay-info-value">
                  {storedRef}
                  <button className="cpay-copy" onClick={handleCopy} title="Copier la référence">
                    <i className={copied ? 'fas fa-check' : 'far fa-copy'} />
                  </button>
                </span>
              </div>
              {amount && (
                <div className="cpay-info-row">
                  <span className="cpay-info-label">Montant</span>
                  <span className="cpay-info-value">{formatPrice(amount)}</span>
                </div>
              )}
            </div>

            <p className="cpay-redirect">
              Redirection automatique dans {redirectCount} seconde{redirectCount > 1 ? 's' : ''}…
            </p>

            <div className="cpay-actions">
              <button className="cpay-btn cpay-btn--primary" onClick={handleGoToOrder}>
                Voir ma commande <i className="fas fa-arrow-right" />
              </button>
            </div>
          </>
        )}

        {/* ═══ FAILED ═══ */}
        {status === 'FAILED' && (
          <>
            <div className="cpay-icon cpay-icon--failed">
              <i className="fas fa-xmark" />
            </div>

            <span className="cpay-tag cpay-tag--failed">Paiement non abouti</span>
            <h2 className="cpay-heading">La transaction n&apos;a pas pu être confirmée</h2>
            <p className="cpay-desc">
              Aucun montant n&apos;a été débité de votre compte.
              Vous pouvez réessayer en toute sécurité.
            </p>

            <div className="cpay-causes">
              <p className="cpay-causes-title">Causes possibles</p>
              <ul>
                <li>Code PIN incorrect</li>
                <li>Solde insuffisant</li>
                <li>Délai d&apos;attente dépassé côté opérateur</li>
              </ul>
            </div>

            <div className="cpay-ref">
              <div>
                <div className="cpay-ref-label">Référence</div>
                <div className="cpay-ref-value">
                  {storedRef}
                  <button className="cpay-copy" onClick={handleCopy} title="Copier">
                    <i className={copied ? 'fas fa-check' : 'far fa-copy'} />
                  </button>
                </div>
              </div>
            </div>
            <p className="cpay-ref-note">À conserver en cas de réclamation.</p>

            <div className="cpay-actions">
              <button className="cpay-btn cpay-btn--primary" onClick={handleRetry}>
                <i className="fas fa-redo" /> Réessayer le paiement
              </button>
              <button className="cpay-btn cpay-btn--ghost" onClick={handleCancel}>
                Retour à mes commandes
              </button>
            </div>
          </>
        )}

        {/* ═══ EXPIRED ═══ */}
        {status === 'EXPIRED' && (
          <>
            <div className="cpay-icon cpay-icon--expired">
              <i className="far fa-clock" />
            </div>

            <span className="cpay-tag cpay-tag--expired">Délai dépassé</span>
            <h2 className="cpay-heading">Le paiement a expiré</h2>
            <p className="cpay-desc">
              Votre demande de paiement a expiré après dix minutes
              sans confirmation. Aucun montant n&apos;a été débité.
            </p>
            <p className="cpay-desc" style={{ marginTop: '-0.5rem' }}>
              Vous pouvez réessayer ou choisir une autre méthode de paiement.
            </p>

            <div className="cpay-ref">
              <div>
                <div className="cpay-ref-label">Référence</div>
                <div className="cpay-ref-value">
                  {storedRef}
                  <button className="cpay-copy" onClick={handleCopy} title="Copier">
                    <i className={copied ? 'fas fa-check' : 'far fa-copy'} />
                  </button>
                </div>
              </div>
            </div>

            <div className="cpay-actions">
              <button className="cpay-btn cpay-btn--primary" onClick={handleRetry}>
                <i className="fas fa-redo" /> Réessayer le paiement
              </button>
              <button className="cpay-btn cpay-btn--ghost" onClick={handleCancel}>
                Retour à mes commandes
              </button>
            </div>
          </>
        )}

        {/* ═══ TIMEOUT ═══ */}
        {status === 'TIMEOUT' && (
          <>
            <div className="cpay-icon cpay-icon--expired">
              <i className="far fa-clock" />
            </div>

            <span className="cpay-tag cpay-tag--expired">Vérification en attente</span>
            <h2 className="cpay-heading">Votre paiement prend plus de temps que prévu</h2>
            <p className="cpay-desc">
              Si vous avez bien saisi votre code PIN et confirmé le paiement
              sur votre téléphone, la confirmation peut arriver en différé.
              Consultez vos commandes dans quelques minutes.
            </p>
            <p className="cpay-desc" style={{ marginTop: '-0.5rem' }}>
              Si vous n&apos;avez pas finalisé le paiement, vous pouvez réessayer.
            </p>

            <div className="cpay-ref">
              <div>
                <div className="cpay-ref-label">Référence</div>
                <div className="cpay-ref-value">
                  {storedRef}
                  <button className="cpay-copy" onClick={handleCopy} title="Copier">
                    <i className={copied ? 'fas fa-check' : 'far fa-copy'} />
                  </button>
                </div>
              </div>
            </div>
            <p className="cpay-ref-note">À conserver en cas de réclamation.</p>

            <div className="cpay-actions">
              <button className="cpay-btn cpay-btn--primary" onClick={() => navigate('/orders')}>
                Voir mes commandes <i className="fas fa-arrow-right" />
              </button>
              <button className="cpay-btn cpay-btn--ghost" onClick={handleRetry}>
                <i className="fas fa-redo" /> Réessayer le paiement
              </button>
              <button className="cpay-btn cpay-btn--ghost" onClick={() => navigate('/')}>
                Retour à l&apos;accueil
              </button>
            </div>
          </>
        )}

        {/* ═══ ERROR ═══ */}
        {status === 'ERROR' && (
          <>
            <div className="cpay-icon cpay-icon--failed">
              <i className="fas fa-xmark" />
            </div>

            <span className="cpay-tag cpay-tag--failed">Erreur</span>
            <h2 className="cpay-heading">Vérification impossible</h2>
            <p className="cpay-desc">
              Une erreur est survenue lors de la vérification du paiement.
              Si le problème persiste, contactez-nous avec la référence ci-dessous.
            </p>

            <div className="cpay-ref">
              <div>
                <div className="cpay-ref-label">Référence</div>
                <div className="cpay-ref-value">
                  {storedRef}
                  <button className="cpay-copy" onClick={handleCopy} title="Copier">
                    <i className={copied ? 'fas fa-check' : 'far fa-copy'} />
                  </button>
                </div>
              </div>
            </div>

            <div className="cpay-actions">
              <button className="cpay-btn cpay-btn--primary" onClick={handleRetry}>
                <i className="fas fa-redo" /> Réessayer
              </button>
              <button className="cpay-btn cpay-btn--ghost" onClick={handleCancel}>
                Retour à mes commandes
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default CheckoutPayment;
