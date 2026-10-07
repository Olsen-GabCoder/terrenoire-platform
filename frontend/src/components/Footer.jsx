import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { newsletterAPI } from '../services/api';
import { TnDivider } from './ui';
import '../styles/Footer.css';

const LOGO_SRC = '/images/logo_terre_noire.png';

const AFRICAN_QUOTES = [
  { text: "Le danger de l'histoire unique, c'est qu'elle vole aux gens leur dignité.", author: "Chimamanda Ngozi Adichie" },
  { text: "L'Afrique est un continent, pas un pays. Et ses histoires méritent d'être racontées dans toute leur complexité.", author: "Chimamanda Ngozi Adichie" },
  { text: "Un vieillard qui meurt, c'est une bibliothèque qui brûle.", author: "Amadou Hampâté Bâ" },
  { text: "La culture est ce qui reste quand on a tout oublié.", author: "Amadou Hampâté Bâ" },
  { text: "Tant que les lions n'auront pas leurs propres historiens, les histoires de chasse glorifieront toujours le chasseur.", author: "Proverbe africain" },
  { text: "Ce n'est pas le fleuve qui est grand, c'est l'eau.", author: "Proverbe beti" },
];

const Footer = ({ minimal = false }) => {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showTop, setShowTop] = useState(false);
  const [quote] = useState(() => AFRICAN_QUOTES[Math.floor(Math.random() * AFRICAN_QUOTES.length)]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setApiError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      return;
    }
    setBusy(true);
    try {
      const res = await newsletterAPI.subscribe(email.trim().toLowerCase());
      if (res.data?.success) {
        setStatus('success');
        setEmail('');
        setTimeout(() => setStatus(''), 5000);
      } else {
        setStatus('network-error');
      }
    } catch (err) {
      const msg = err.response?.data?.email?.[0] || err.response?.data?.detail || '';
      if (msg.includes('déjà inscrit')) {
        setStatus('already-subscribed');
      } else if (msg) {
        setStatus('api-error');
        setApiError(msg);
      } else {
        setStatus('network-error');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <footer className={`ft ${minimal ? 'ft--minimal' : ''}`}>
        <div className="ft__motif-bg tn-motif-bg" />

        {/* ── CITATION AFRICAINE ── */}
        {!minimal && (
        <div className="ft__citation">
          <blockquote className="ft__citation-text">
            « {quote.text} »
          </blockquote>
          <cite className="ft__citation-author">— {quote.author}</cite>
        </div>
        )}

        {/* ── MAIN 4-COLUMN GRID ── */}
        <div className="ft__main">
          <div className="ft__wrap">
            {!minimal && (<>
            <div className="ft__grid">

              {/* COL 1 — Brand */}
              <div className="ft-brand">
                <div className="ft-brand__header">
                  <img src={LOGO_SRC} alt="Terre Noire" className="ft-brand__logo" />
                  <div className="ft-brand__text">
                    <span className="ft-brand__name">TERRE NOIRE</span>
                    <span className="ft-brand__edition">Éditions</span>
                  </div>
                </div>

                <p className="ft-brand__tagline">« Demain s'écrit aujourd'hui. »</p>

                <p className="ft-brand__desc">
                  Maison d'édition littéraire africaine, imprimerie et librairie.
                </p>

                <div className="ft-social">
                  {[
                    { href: 'https://www.facebook.com/profile.php?id=61556564940483', icon: 'fab fa-facebook-f', label: 'Facebook' },
                    { href: 'https://instagram.com/terre_noire_editions', icon: 'fab fa-instagram', label: 'Instagram' },
                    { href: 'https://www.tiktok.com/@terrenoireedition?_r=1&_t=ZS-96fCndnPtAa', icon: 'fab fa-tiktok', label: 'TikTok' },
                    { href: 'https://wa.me/24176593535', icon: 'fab fa-whatsapp', label: 'WhatsApp' },
                    { href: 'mailto:terrenoireeditions@gmail.com', icon: 'fas fa-envelope', label: 'Email' },
                  ].map((s) => (
                    <a key={s.label} href={s.href} className="ft-social__link" aria-label={s.label} target="_blank" rel="noopener noreferrer">
                      <i className={s.icon} />
                    </a>
                  ))}
                </div>
              </div>

              {/* COL 2 — Services */}
              <nav>
                <h3 className="ft-col__title">Services</h3>
                <ul className="ft-links">
                  {[
                    { href: '/submit-manuscript', text: 'Soumettre un manuscrit' },
                    { href: '/delivery', text: 'Livraison & Retours' },
                    { href: '/faq', text: 'FAQ' },
                    { href: '/support', text: 'Support' },
                    { href: '/cgv', text: 'CGV' },
                  ].map((l) => (
                    <li key={l.href}><Link to={l.href}>{l.text}</Link></li>
                  ))}
                </ul>
              </nav>

              {/* COL 4 — Contact */}
              <div>
                <h3 className="ft-col__title">Contact</h3>
                <div className="ft-contact">
                  {[
                    { icon: 'fas fa-location-dot', label: 'Gabon' },
                    { icon: 'fas fa-phone', label: '+241 65 34 88 87' },
                    { icon: 'fas fa-envelope', label: 'terrenoireeditions@gmail.com' },
                    { icon: 'fab fa-whatsapp', label: 'WhatsApp · +241 76 59 35 35' },
                  ].map((c) => (
                    <div className="ft-contact__row" key={c.label}>
                      <div className="ft-contact__icon"><i className={c.icon} /></div>
                      <div className="ft-contact__info">
                        <span className="ft-contact__label-text">{c.label}</span>
                        {c.value && <span className="ft-contact__value">{c.value}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── NEWSLETTER STRIP ── */}
            <div className="ft-newsletter-strip">
              <div className="ft-newsletter-strip__bg tn-motif-bg" />
              <div className="ft-newsletter-strip__content">
                <div className="ft-newsletter-strip__info">
                  <span className="ft-newsletter-strip__label">Newsletter</span>
                  <h4 className="ft-newsletter-strip__title">Recevez nos prochaines parutions</h4>
                  <p className="ft-newsletter-strip__desc">Une lettre éditoriale par mois — pas de spam, jamais.</p>
                </div>
                <form onSubmit={handleSubmit} className="ft-newsletter-strip__form">
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                    className={`tn-input tn-input--dark ${status === 'error' ? 'ft-newsletter--error' : ''}`}
                    aria-label="Email newsletter"
                  />
                  <button type="submit" className="tn-btn tn-btn--primary" disabled={busy}>
                    <i className={busy ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'} /> S'abonner
                  </button>
                </form>
              </div>
              {status === 'success' && (
                <p className="ft-newsletter-strip__msg ft-newsletter-strip__msg--ok"><i className="fas fa-envelope" /> Un email de confirmation vous a été envoyé. Vérifiez votre boîte de réception.</p>
              )}
              {status === 'already-subscribed' && (
                <p className="ft-newsletter-strip__msg ft-newsletter-strip__msg--err"><i className="fas fa-info-circle" /> Cet email est déjà inscrit.</p>
              )}
              {status === 'api-error' && (
                <p className="ft-newsletter-strip__msg ft-newsletter-strip__msg--err"><i className="fas fa-exclamation-circle" /> {apiError}</p>
              )}
              {(status === 'error' || status === 'network-error') && (
                <p className="ft-newsletter-strip__msg ft-newsletter-strip__msg--err"><i className="fas fa-exclamation-circle" /> {status === 'error' ? 'Veuillez entrer une adresse email valide.' : 'Erreur de connexion, veuillez réessayer.'}</p>
              )}
            </div>

            </>)}

            {/* ── PAYMENTS + BOTTOM ── */}
            <div className="ft__bottom-section">
              <TnDivider dark />
              <div className="ft__payments-row">
                <div className="ft__payments-chips">
                  <span className="ft__payments-label">Paiements sécurisés</span>
                  {[
                    { src: '/images/mobicash.jpeg', alt: 'Moov Money' },
                    { src: '/images/airtel money.png', alt: 'Airtel Money' },
                    { icon: 'fas fa-lock', alt: 'BambooPay' },
                  ].map(p => (
                    <span className="ft__pay-chip" key={p.alt}>
                      {p.src
                        ? <img src={p.src} alt="" className="ft__pay-img" />
                        : <i className={`${p.icon} ft__pay-icon`} aria-hidden="true" />}
                      <span>{p.alt}</span>
                    </span>
                  ))}
                </div>
                <div className="ft__legal">
                  <span>&copy; {year} Terre Noire Éditions</span>
                  <span className="ft__legal-sep">·</span>
                  <Link to="/cgv">CGV</Link>
                  <span className="ft__legal-sep">·</span>
                  <Link to="/privacy">Confidentialité</Link>
                  <span className="ft__legal-sep">·</span>
                  <Link to="/cookies">Cookies</Link>
                </div>
              </div>
              {!minimal && (
              <div className="ft__credit">
                <span className="ft__credit-label">Conception & Développement</span>
                <Link to="/concepteur" className="ft__credit-dev">
                  <span className="ft__credit-dev-name">Olsen Kampala</span>
                  <i className="fas fa-arrow-right ft__credit-dev-icon" aria-hidden="true" />
                </Link>
              </div>
              )}
            </div>

            {/* ── COLOPHON ── */}
            {!minimal && (
            <div className="ft__colophon">
              Terre Noire Éditions est composée en Playfair Display &amp; Inter.
            </div>
            )}
          </div>
        </div>
      </footer>

      {/* Back to top */}
      {showTop && (
        <button className="ft-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Haut de page">
          <i className="fas fa-arrow-up" />
        </button>
      )}

    </>
  );
};

export default Footer;
