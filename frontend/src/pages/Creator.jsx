import { Link } from 'react-router-dom';
import '../styles/Creator.css';

const PHOTO_SRC = '/images/photo_olsen.jpg';

// Coordonnées : affichage national, liens au format international (+241, sans le 0)
const CONTACT = {
  email: 'olsenkampala@gmail.com',
  phoneDisplay: '+241 74 30 16 39',
  phoneHref: 'tel:+24174301639',
  whatsapp: 'https://wa.me/24174301639',
};

const DOMAINS = [
  { icon: 'fa-code', title: 'Développement web & mobile', desc: 'React, Django, API REST, React Native' },
  { icon: 'fa-brain', title: 'Intelligence artificielle', desc: 'Machine Learning, Deep Learning, NLP' },
  { icon: 'fa-database', title: 'Data & cloud', desc: 'PostgreSQL, Python, Docker, CI/CD' },
  { icon: 'fa-feather-pointed', title: 'Écriture & conférences', desc: 'Auteur, orateur, transmission du savoir' },
];

const PLATFORM = [
  { icon: 'fa-book-open', title: 'Catalogue & collections', desc: 'Livres, collections et auteurs, pensés d’abord pour le mobile.' },
  { icon: 'fa-tablet-screen-button', title: 'Lecture numérique', desc: 'Une liseuse en ligne protégée pour les ebooks et les extraits.' },
  { icon: 'fa-mobile-screen-button', title: 'Paiement mobile', desc: 'Moov Money, Airtel Money et BambooPay, intégrés au parcours d’achat.' },
  { icon: 'fa-pen-nib', title: 'Manuscrits', desc: 'La soumission des manuscrits et leur suivi éditorial.' },
];

const SKILLS = ['Python', 'JavaScript', 'React', 'Django', 'TensorFlow', 'PostgreSQL', 'Docker', 'Git', 'React Native', 'NLP'];

const Creator = () => (
  <div className="cr-page">
    {/* ── EN-TÊTE ── */}
    <section className="cr-hero">
      <div className="tn-motif-bg cr-hero__motif" aria-hidden="true" />
      <div className="cr-hero__glow" aria-hidden="true" />

      <div className="cr-hero__inner">
        <figure className="cr-hero__portrait">
          <img src={PHOTO_SRC} alt="Portrait d'Olsen Kampala" width="1280" height="853" />
        </figure>

        <div className="cr-hero__info">
          <nav className="cr-hero__breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/">Terre Noire Éditions</Link> / Le concepteur
          </nav>
          <p className="cr-hero__roles">Ingénieur informatique · Écrivain · Conférencier</p>
          <h1 className="cr-hero__name">
            Olsen <em>Kampala</em>
          </h1>
          <p className="cr-hero__lead">
            Concepteur et développeur de la plateforme Terre Noire Éditions.
          </p>
          <p className="cr-hero__location">
            <i className="fas fa-location-dot" aria-hidden="true" /> Libreville, Gabon
          </p>
          <div className="cr-hero__actions">
            <a href="#contact" className="tn-btn tn-btn--primary tn-btn--lg">
              <i className="fas fa-paper-plane" aria-hidden="true" /> Me contacter
            </a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="tn-btn tn-btn--outline-light tn-btn--lg">
              <i className="fab fa-whatsapp" aria-hidden="true" /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
    <div className="tn-motif-strip" style={{ opacity: 0.6 }} aria-hidden="true" />

    {/* ── PORTRAIT ── */}
    <section className="cr-section cr-bio">
      <span className="cr-label">Portrait</span>
      <div className="cr-bio__text">
        <p>
          <span className="cr-bio__dropcap">I</span>ngénieur informatique, écrivain et conférencier, Olsen Kampala est passionné
          par la création de solutions digitales à fort impact. Il allie expertise technique et sensibilité littéraire.
        </p>
        <p>
          C&apos;est cette double culture, celle du code et celle du livre, qui l&apos;a conduit à concevoir et à
          développer la plateforme de Terre Noire Éditions.
        </p>
      </div>
    </section>

    {/* ── DOMAINES ── */}
    <section className="cr-section">
      <span className="cr-label">Domaines</span>
      <h2 className="cr-title">Ce qu&apos;il <em>maîtrise</em></h2>
      <div className="cr-grid">
        {DOMAINS.map((d) => (
          <article key={d.title} className="cr-card">
            <div className="cr-card__icon" aria-hidden="true"><i className={`fas ${d.icon}`} /></div>
            <h3 className="cr-card__title">{d.title}</h3>
            <p className="cr-card__desc">{d.desc}</p>
          </article>
        ))}
      </div>
    </section>

    {/* ── LA PLATEFORME ── */}
    <section className="cr-section">
      <span className="cr-label">Une création</span>
      <h2 className="cr-title">Derrière <em>Terre Noire Éditions</em></h2>
      <p className="cr-intro">
        Conçue et développée par Olsen Kampala, la plateforme réunit tout ce qu&apos;il faut pour découvrir,
        acheter et lire les ouvrages de la maison.
      </p>
      <ul className="cr-platform">
        {PLATFORM.map((p) => (
          <li key={p.title} className="cr-platform__item">
            <span className="cr-platform__icon" aria-hidden="true"><i className={`fas ${p.icon}`} /></span>
            <span>
              <strong className="cr-platform__title">{p.title}</strong>
              <span className="cr-platform__desc">{p.desc}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="cr-stackline">
        <span>React</span><span aria-hidden="true">·</span><span>Django</span><span aria-hidden="true">·</span><span>PostgreSQL</span>
      </p>
    </section>

    {/* ── COMPÉTENCES ── */}
    <section className="cr-section">
      <span className="cr-label">Compétences</span>
      <h2 className="cr-title">Quelques <em>outils</em></h2>
      <ul className="cr-tags">
        {SKILLS.map((t) => <li key={t} className="cr-tag">{t}</li>)}
      </ul>
    </section>

    {/* ── CONTACT ── */}
    <section className="cr-section cr-section--last" id="contact">
      <div className="cr-contact">
        <div className="tn-motif-bg cr-contact__motif" aria-hidden="true" />
        <div className="cr-contact__content">
          <span className="cr-contact__eyebrow">Contact</span>
          <h2 className="cr-contact__title">Un projet ? <em>Parlons-en.</em></h2>
          <p className="cr-contact__text">Écrivez-moi ou appelez-moi : je vous réponds avec plaisir.</p>
          <div className="cr-contact__links">
            <a href={`mailto:${CONTACT.email}`} className="cr-contact__link">
              <i className="fas fa-envelope" aria-hidden="true" />
              <span>{CONTACT.email}</span>
            </a>
            <a href={CONTACT.phoneHref} className="cr-contact__link">
              <i className="fas fa-phone" aria-hidden="true" />
              <span>{CONTACT.phoneDisplay}</span>
            </a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="cr-contact__link cr-contact__link--wa">
              <i className="fab fa-whatsapp" aria-hidden="true" />
              <span>Discuter sur WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default Creator;
