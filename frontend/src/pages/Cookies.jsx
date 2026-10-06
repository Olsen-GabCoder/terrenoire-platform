import { Link } from 'react-router-dom';
import '../styles/Cookies.css';

const LAST_UPDATED = '21 mai 2026';

const Cookies = () => (
  <div className="cookies-page">
    <section className="cookies-hero">
      <div className="cookies-hero__orb cookies-hero__orb--1" />
      <div className="cookies-hero__grid-bg" />
      <div className="cookies-hero__inner">
        <div className="cookies-hero__line" />
        <h1 className="cookies-hero__title">Politique de cookies</h1>
        <p className="cookies-hero__sub">
          Comprendre comment et pourquoi nous utilisons les cookies sur notre site.
        </p>
      </div>
    </section>
    <div className="cookies-hero-fade" />

    <div className="cookies-content">
      <p className="ck-intro">
        La présente politique décrit les cookies utilisés par le site
        <strong> terrenoireeditions.com</strong> et les moyens dont vous disposez
        pour les gérer. Dernière mise à jour : <strong>{LAST_UPDATED}</strong>.
      </p>

      {/* ── 1. QU'EST-CE QU'UN COOKIE ── */}
      <div className="ck-card">
        <div className="ck-section-header">
          <span className="ck-section-num">01</span>
          <h2>Qu&apos;est-ce qu&apos;un cookie ?</h2>
        </div>
        <p>
          Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur,
          téléphone, tablette) par le serveur du site que vous visitez. Il permet au site
          de se souvenir de vos actions et préférences (langue, taille d&apos;affichage,
          identifiants de session) pendant une durée déterminée.
        </p>
        <p>
          Les cookies ne contiennent aucun logiciel malveillant et ne peuvent pas accéder
          aux autres fichiers de votre appareil.
        </p>
      </div>

      {/* ── 2. COOKIES UTILISES ── */}
      <div className="ck-card">
        <div className="ck-section-header">
          <span className="ck-section-num">02</span>
          <h2>Cookies utilisés sur notre site</h2>
        </div>
        <p>
          Nous utilisons trois catégories de cookies. Voici le détail de chacune :
        </p>

        {/* Essentiels */}
        <div className="ck-type-card ck-type-card--essential">
          <div className="ck-type-header">
            <div className="ck-type-icon ck-type-icon--essential"><i className="fas fa-lock" /></div>
            <div>
              <h3>Cookies essentiels</h3>
              <span className="ck-type-badge ck-type-badge--required">Toujours actifs</span>
            </div>
          </div>
          <p>
            Indispensables au fonctionnement du site. Sans eux, vous ne pouvez pas
            naviguer correctement ni utiliser certaines fonctionnalités.
          </p>
          <div className="ck-table-wrap">
            <table className="ck-table">
              <thead><tr><th>Finalité</th><th>Description</th><th>Durée</th></tr></thead>
              <tbody>
                <tr><td>Authentification</td><td>Maintient votre session de connexion sécurisée</td><td>12 heures</td></tr>
                <tr><td>Renouvellement de session</td><td>Permet de rester connecté sans re-saisir vos identifiants</td><td>7 jours</td></tr>
                <tr><td>Sécurité</td><td>Protection contre les soumissions de formulaires frauduleuses</td><td>Session</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fonctionnels */}
        <div className="ck-type-card ck-type-card--functional">
          <div className="ck-type-header">
            <div className="ck-type-icon ck-type-icon--functional"><i className="fas fa-sliders" /></div>
            <div>
              <h3>Cookies fonctionnels</h3>
              <span className="ck-type-badge ck-type-badge--optional">Optionnels</span>
            </div>
          </div>
          <p>
            Permettent de mémoriser vos préférences pour améliorer votre confort de
            navigation.
          </p>
          <div className="ck-table-wrap">
            <table className="ck-table">
              <thead><tr><th>Finalité</th><th>Description</th><th>Durée</th></tr></thead>
              <tbody>
                <tr><td>Panier</td><td>Sauvegarde le contenu de votre panier d&apos;achat</td><td>30 jours</td></tr>
                <tr><td>Liste d&apos;envie</td><td>Mémorise vos livres favoris (visiteurs non connectés)</td><td>30 jours</td></tr>
                <tr><td>Préférences</td><td>Retient vos préférences d&apos;affichage</td><td>12 mois</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytiques */}
        <div className="ck-type-card ck-type-card--analytics">
          <div className="ck-type-header">
            <div className="ck-type-icon ck-type-icon--analytics"><i className="fas fa-chart-bar" /></div>
            <div>
              <h3>Cookies analytiques</h3>
              <span className="ck-type-badge ck-type-badge--optional">Optionnels</span>
            </div>
          </div>
          <p>
            Nous aident à comprendre comment les visiteurs utilisent le site
            (pages consultées, durée de visite, taux de rebond) afin d&apos;améliorer
            nos services. Ces cookies collectent des données anonymisées.
          </p>
          <div className="ck-table-wrap">
            <table className="ck-table">
              <thead><tr><th>Service</th><th>Finalité</th><th>Durée</th></tr></thead>
              <tbody>
                <tr><td>Statistiques internes</td><td>Fréquentation, pages vues, parcours utilisateur</td><td>13 mois max</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 3. COOKIES TIERS ── */}
      <div className="ck-card">
        <div className="ck-section-header">
          <span className="ck-section-num">03</span>
          <h2>Cookies tiers</h2>
        </div>
        <p>
          Certains services tiers intégrés à notre site peuvent déposer leurs propres
          cookies :
        </p>
        <ul>
          <li>
            <strong>Prestataires de paiement</strong> (Airtel Money, Moov Money, Visa) :
            cookies de session nécessaires au traitement sécurisé de votre paiement.
            Nous n&apos;avons pas de contrôle sur ces cookies — consultez les politiques
            de confidentialité respectives de ces opérateurs.
          </li>
          <li>
            <strong>Polices de caracteres</strong> (Google Fonts) : chargement des polices
            d&apos;affichage du site.
          </li>
        </ul>
      </div>

      {/* ── 4. GERER VOS COOKIES ── */}
      <div className="ck-card">
        <div className="ck-section-header">
          <span className="ck-section-num">04</span>
          <h2>Comment gérer vos cookies</h2>
        </div>
        <p>
          Vous pouvez à tout moment modifier vos préférences de cookies via les paramètres
          de votre navigateur. Voici comment procéder :
        </p>
        <div className="ck-browser-grid">
          {[
            ['fa-brands fa-chrome', 'Google Chrome', 'Paramètres > Confidentialité et sécurité > Cookies et autres données des sites'],
            ['fa-brands fa-firefox-browser', 'Mozilla Firefox', 'Options > Vie privée et sécurité > Cookies et données de sites'],
            ['fa-brands fa-safari', 'Safari', 'Préférences > Confidentialité > Gérer les données de sites web'],
            ['fa-brands fa-edge', 'Microsoft Edge', 'Paramètres > Cookies et autorisations de site > Cookies'],
          ].map(([icon, name, path], i) => (
            <div key={i} className="ck-browser-item">
              <i className={icon} />
              <strong>{name}</strong>
              <p>{path}</p>
            </div>
          ))}
        </div>
        <div className="ck-highlight">
          <i className="fas fa-exclamation-triangle" />
          <p>
            <strong>Attention :</strong> la suppression ou le blocage de certains cookies
            essentiels peut empêcher le bon fonctionnement du site (impossibilité de se
            connecter, panier vide, etc.).
          </p>
        </div>
      </div>

      {/* ── 5. DUREE DE VIE ── */}
      <div className="ck-card">
        <div className="ck-section-header">
          <span className="ck-section-num">05</span>
          <h2>Durée de conservation</h2>
        </div>
        <p>
          Les cookies essentiels et fonctionnels ont une durée de vie limitée (de la
          session à 12 mois maximum). Les cookies analytiques sont conservés
          <strong> 13 mois</strong> au maximum, conformement aux recommandations
          internationales.
        </p>
        <p>
          À l&apos;expiration de leur durée de vie, les cookies sont automatiquement
          supprimés de votre appareil.
        </p>
      </div>

      {/* ── 6. BASE LEGALE ── */}
      <div className="ck-card">
        <div className="ck-section-header">
          <span className="ck-section-num">06</span>
          <h2>Base légale</h2>
        </div>
        <p>
          L&apos;utilisation des cookies est encadrée par la <strong>Loi n° 025/2021
          du 28 décembre 2021</strong> portant réglementation des transactions électroniques
          en République gabonaise et par la <strong>Loi n° 001/2011 modifiée par
          la Loi n° 025/2023</strong> relative à la protection des données à caractère
          personnel.
        </p>
        <ul>
          <li><strong>Cookies essentiels :</strong> déposés sans consentement préalable (nécessaires au fonctionnement).</li>
          <li><strong>Cookies fonctionnels et analytiques :</strong> déposés avec votre consentement implicite (poursuite de la navigation) ou explicite.</li>
        </ul>
      </div>

      {/* ── 7. CONTACT ── */}
      <div className="ck-card ck-card--contact">
        <div className="ck-section-header">
          <span className="ck-section-num">07</span>
          <h2>Questions et contact</h2>
        </div>
        <p>
          Pour toute question relative à notre utilisation des cookies ou pour exercer
          vos droits, contactez-nous :
        </p>
        <div className="ck-contact-row">
          <a href="mailto:terrenoireeditions@gmail.com" className="ck-contact-item">
            <i className="fas fa-envelope" />
            <span>terrenoireeditions@gmail.com</span>
          </a>
          <a href="tel:+24165348887" className="ck-contact-item">
            <i className="fas fa-phone" />
            <span>+241 65 34 88 87</span>
          </a>
        </div>
        <div className="ck-cta">
          <Link to="/privacy" className="ck-btn ck-btn--outline">
            <i className="fas fa-shield-halved" /> Politique de confidentialité
          </Link>
          <Link to="/cgv" className="ck-btn ck-btn--outline">
            <i className="fas fa-file-contract" /> Conditions générales de vente
          </Link>
          <Link to="/catalog" className="ck-btn ck-btn--primary">
            <i className="fas fa-book" /> Retour au catalogue
          </Link>
        </div>
      </div>

    </div>
  </div>
);

export default Cookies;
