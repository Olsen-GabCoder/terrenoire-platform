import { useState } from 'react';
import { Link } from 'react-router-dom';
import { contactAPI, handleApiError } from '../services/api';
import TnInput from '../components/ui/TnInput';
import TnSelect from '../components/ui/TnSelect';
import TnTextarea from '../components/ui/TnTextarea';
import TnButton from '../components/ui/TnButton';
import TnAlert from '../components/ui/TnAlert';
import '../styles/Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', subject: 'Commande', message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');
    try {
      const res = await contactAPI.submit(formData);
      if (res.data?.success) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: 'Commande', message: '' });
      } else {
        setSubmitStatus('error');
        setErrorMessage(res.data?.message || 'Une difficulté est survenue.');
      }
    } catch (err) {
      setSubmitStatus('error');
      setErrorMessage(handleApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">

      {/* ══════════ HERO ══════════ */}
      <section className="ct-hero">
        <div className="ct-hero__orb ct-hero__orb--1" />
        <div className="ct-hero__orb ct-hero__orb--2" />
        <div className="ct-hero__grid-bg" />
        <div className="ct-hero__inner">
          <span className="ct-hero__pill">
            <span className="ct-hero__pill-dot" />
            Disponible · Port-Gentil, Gabon
          </span>
          <div className="ct-hero__line" />
          <h1 className="ct-hero__title">Contactez-<span className="ct-hero__title-accent">nous</span></h1>
          <p className="ct-hero__sub">
            Une question, un projet d&apos;édition ou une commande ?
            Notre équipe est à votre écoute.
          </p>
          <div className="ct-hero__trust">
            {[
              ['fa-clock', 'Réponse sous 24h'],
              ['fa-shield-halved', 'Données sécurisées'],
              ['fa-headset', 'Support humain'],
            ].map(([icon, label]) => (
              <span key={label} className="ct-hero__trust-item">
                <i className={`fas ${icon}`} /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="ct-hero-fade" />

      {/* ══════════ CONTENU ══════════ */}
      <div className="ct-content">

        {/* ── INFOS DE CONTACT ── */}
        <div className="ct-info-row">
          {[
            ['fa-envelope', 'Email', 'terrenoireeditions@gmail.com', 'mailto:terrenoireeditions@gmail.com'],
            ['fa-phone', 'Téléphone', '+241 65 34 88 87', 'tel:+24165348887'],
            ['fa-brands fa-whatsapp', 'WhatsApp', '+241 76 59 35 35', 'https://wa.me/24176593535'],
            ['fa-location-dot', 'Adresse', 'Port-Gentil, Gabon', null],
          ].map(([icon, title, value, href]) => (
            <div key={title} className="ct-info-card">
              <div className="ct-info-card__icon"><i className={`fas ${icon}`} /></div>
              <div>
                <h3>{title}</h3>
                {href ? (
                  <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>{value}</a>
                ) : (
                  <p>{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── FORMULAIRE ── */}
        <div className="ct-card ct-card--form">
          <div className="ct-section-header">
            <span className="ct-section-num"><i className="fas fa-paper-plane" /></span>
            <div>
              <h2>Envoyez-nous un message</h2>
              <p className="ct-section-desc">Remplissez le formulaire, nous vous répondrons sous 24h.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="ct-form">
            <div className="ct-form__row">
              <TnInput
                label="Nom complet"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Votre nom"
                required
                leftIcon={<i className="fas fa-user" />}
              />
              <TnInput
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                required
                leftIcon={<i className="fas fa-envelope" />}
              />
            </div>

            <TnSelect
              label="Sujet"
              name="subject"
              required
              value={formData.subject}
              onChange={handleChange}
              leftIcon={<i className="fas fa-tag" />}
              options={[
                { value: 'Commande', label: 'Question commande' },
                { value: 'Manuscrit', label: 'Soumission manuscrit' },
                { value: 'Partenariat', label: 'Partenariat' },
                { value: 'Autre', label: 'Autre' },
              ]}
            />

            <TnTextarea
              label="Message"
              name="message"
              rows={5}
              required
              value={formData.message}
              onChange={handleChange}
              placeholder="Décrivez votre demande en détail..."
              leftIcon={<i className="fas fa-pen" />}
            />

            <TnButton
              type="submit"
              variant="primary"
              block
              loading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<i className="fas fa-paper-plane" />}
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
            </TnButton>

            {submitStatus === 'success' && (
              <TnAlert variant="success">Message envoyé ! Nous vous répondrons très bientôt.</TnAlert>
            )}
            {submitStatus === 'error' && (
              <TnAlert variant="error">{errorMessage || 'Une difficulté est survenue.'}</TnAlert>
            )}
          </form>
        </div>

        {/* ── RESEAUX SOCIAUX + FAQ ── */}
        <div className="ct-bottom-row">
          <div className="ct-card">
            <div className="ct-section-header">
              <span className="ct-section-num"><i className="fas fa-share-nodes" /></span>
              <h2>Retrouvez-nous</h2>
            </div>
            <div className="ct-social-grid">
              {[
                ['fab fa-facebook-f', 'Facebook', 'https://www.facebook.com/profile.php?id=61556564940483', '#1877f2'],
                ['fab fa-tiktok', 'TikTok', 'https://www.tiktok.com/@terrenoireedition?_r=1&_t=ZS-96fCndnPtAa', '#000'],
                ['fab fa-whatsapp', 'WhatsApp', 'https://wa.me/24176593535', '#25d366'],
                ['fas fa-envelope', 'Email', 'mailto:terrenoireeditions@gmail.com', 'var(--color-primary)'],
              ].map(([icon, label, href, color]) => (
                <a key={label} href={href} className="ct-social-link" target="_blank" rel="noopener noreferrer" style={{ '--social-color': color }}>
                  <i className={icon} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="ct-card">
            <div className="ct-section-header">
              <span className="ct-section-num"><i className="fas fa-circle-question" /></span>
              <h2>Questions fréquentes</h2>
            </div>
            <div className="ct-faq-list">
              {[
                ['Commande', 'Panier puis paiement via Moov Money, Airtel Money ou BambooPay.'],
                ['Livraison', '24 à 72 h à Port-Gentil, 3 à 7 jours à Libreville, 5 à 10 jours à Lambaréné ; retrait sur place ailleurs.'],
                ['Manuscrit', 'Via le formulaire en ligne ou par email direct.'],
              ].map(([q, a]) => (
                <div key={q} className="ct-faq-item">
                  <strong>{q}</strong>
                  <p>{a}</p>
                </div>
              ))}
              <Link to="/faq" className="ct-faq-link">
                Voir toutes les questions <i className="fas fa-arrow-right" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Contact;
