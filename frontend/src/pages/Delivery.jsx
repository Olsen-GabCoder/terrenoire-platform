import { Link } from 'react-router-dom';
import { useDeliveryConfig } from '../context/DeliveryConfigContext';
import '../styles/Delivery.css';

const fmtPrice = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const Delivery = () => {
  const { shippingFreeThreshold, shippingCost } = useDeliveryConfig();

  return (
    <div className="delivery-page">

      {/* ══════════ HERO ══════════ */}
      <section className="dlv-hero">
        <div className="dlv-hero__orb dlv-hero__orb--1" />
        <div className="dlv-hero__orb dlv-hero__orb--2" />
        <div className="dlv-hero__grid-bg" />
        <div className="dlv-hero__inner">
          <span className="dlv-hero__pill"><i className="fas fa-truck-fast" /> Livraison au Gabon</span>
          <div className="dlv-hero__line" />
          <h1 className="dlv-hero__title">Livraison &amp; <span className="dlv-hero__title-accent">Retours</span></h1>
          <p className="dlv-hero__sub">
            Livraison à Libreville, Port-Gentil et Lambaréné, et conditions de retour
            simplifiées. Vos livres en toute sérénité.
          </p>
        </div>
      </section>

      <div className="dlv-hero-fade" />

      <div className="dlv-content">

        {/* ══════════ ZONES DESSERVIES ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">00</span>
            <h2>Zones de livraison desservies</h2>
          </div>
          <p>
            Nous livrons les exemplaires physiques uniquement dans les trois villes suivantes :
          </p>
          <div className="dlv-zones">
            {[
              ['fa-location-dot', 'Libreville', 'Capitale', 'var(--color-primary)'],
              ['fa-location-dot', 'Port-Gentil', 'Siège de Terre Noire Éditions', 'var(--tn-gold, #C8956C)'],
              ['fa-location-dot', 'Lambaréné', 'Province du Moyen-Ogooué', 'var(--color-gray-500)'],
            ].map(([icon, zone, desc, color]) => (
              <div key={zone} className="dlv-zone">
                <div className="dlv-zone__icon" style={{ background: `${color}12`, color }}><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{zone}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="dlv-note">
            <i className="fas fa-info-circle" /> Si votre adresse de livraison ne se trouve pas dans l&apos;une de ces trois villes, vous pourrez tout de même passer commande, mais vous devrez venir la retirer en main propre dans la ville desservie la plus proche. Nous vous contacterons pour organiser le retrait dès que votre commande sera arrivée à destination.
          </p>
        </div>

        {/* ══════════ LIVRAISON ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">01</span>
            <h2>Délais de livraison</h2>
          </div>
          <p>
            Votre commande est préparée puis livrée dans les délais suivants (estimatifs) :
            Nous traitons chaque commande avec soin pour garantir que vos livres arrivent en parfait état.
          </p>
          <div className="dlv-zones">
            {[
              ['fa-location-dot', 'Port-Gentil', '24 à 72 heures ouvrées', 'var(--color-primary)'],
              ['fa-city', 'Libreville', '3 à 7 jours ouvrés', 'var(--tn-gold, #C8956C)'],
              ['fa-city', 'Lambaréné', '5 à 10 jours ouvrés', 'var(--tn-gold, #C8956C)'],
              ['fa-map', 'Autres villes du Gabon', 'Retrait dans l\'une des trois villes', 'var(--color-gray-500)'],
            ].map(([icon, zone, delay, color]) => (
              <div key={zone} className="dlv-zone">
                <div className="dlv-zone__icon" style={{ background: `${color}12`, color }}><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{zone}</strong>
                  <p>{delay}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="dlv-note">
            <i className="fas fa-info-circle" /> Les délais sont estimatifs et peuvent varier selon la saison
            et les conditions de transport. Dès l&apos;expédition, vous recevez un email de notification.
          </p>
        </div>

        {/* ══════════ FRAIS ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">02</span>
            <h2>Frais de livraison</h2>
          </div>
          <div className="dlv-pricing">
            <div className="dlv-price-card dlv-price-card--free">
              <div className="dlv-price-card__badge"><i className="fas fa-gift" /></div>
              <h3>Gratuit</h3>
              <p>À partir de <strong>{fmtPrice(shippingFreeThreshold)} FCFA</strong> d&apos;achat</p>
            </div>
            <div className="dlv-price-card">
              <div className="dlv-price-card__badge"><i className="fas fa-truck" /></div>
              <h3>{fmtPrice(shippingCost)} FCFA</h3>
              <p>Pour les commandes inférieures à {fmtPrice(shippingFreeThreshold)} FCFA</p>
            </div>
          </div>
          <p>
            Les frais sont calculés automatiquement lors du passage en caisse. Les ebooks (contenus
            numériques) ne sont pas soumis à des frais de livraison — ils sont accessibles immédiatement
            après confirmation du paiement.
          </p>
        </div>

        {/* ══════════ SUIVI ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">03</span>
            <h2>Suivi de commande</h2>
          </div>
          <div className="dlv-steps">
            {[
              ['fa-check-circle', 'Confirmation', 'Email de confirmation avec le détail de votre commande.'],
              ['fa-box', 'Préparation', 'Votre commande est préparée et emballée avec soin.'],
              ['fa-truck', 'Expédition', 'Email de notification avec informations de suivi.'],
              ['fa-hand-holding-heart', 'Réception', 'Votre colis arrive — vérifiez son état à la réception.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="dlv-step">
                <div className="dlv-step__num">{i + 1}</div>
                <div className="dlv-step__icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p>
            Vous pouvez consulter l&apos;état de vos commandes à tout moment depuis votre{' '}
            <Link to="/profile">espace client</Link>.
          </p>
        </div>

        {/* ══════════ RETOURS ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">04</span>
            <h2>Droit de rétractation</h2>
          </div>
          <div className="dlv-highlight">
            <i className="fas fa-gavel" />
            <p>
              Conformément à la <strong>Loi n° 025/2021</strong>, vous disposez de{' '}
              <strong>14 jours calendaires</strong> à compter de la réception pour exercer
              votre droit de rétractation, sans avoir à justifier de motif.
            </p>
          </div>
          <h3><i className="fas fa-check" /> Conditions acceptées</h3>
          <ul>
            <li>Livre en parfait état : non lu, non annoté, non corné, non taché</li>
            <li>Emballage d&apos;origine intact</li>
            <li>Demande effectuée dans les 14 jours suivant la réception</li>
          </ul>
          <h3><i className="fas fa-coins" /> Frais de retour</h3>
          <ul>
            <li><strong>À notre charge :</strong> défaut d&apos;impression, livre endommagé à la livraison, erreur de commande</li>
            <li><strong>À votre charge :</strong> changement d&apos;avis, doublon, autre motif personnel</li>
          </ul>
          <h3><i className="fas fa-ban" /> Exclusion ebooks</h3>
          <p>
            Le droit de rétractation ne s&apos;applique pas aux contenus numériques dont le
            téléchargement a commencé. En cas de fichier défectueux, nous renvoyons un lien
            fonctionnel dans les meilleurs délais.
          </p>
        </div>

        {/* ══════════ PROCEDURE ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">05</span>
            <h2>Procédure de retour</h2>
          </div>
          <div className="dlv-steps">
            {[
              ['fa-envelope', 'Contactez-nous', 'Par email, téléphone ou formulaire de contact en précisant votre numéro de commande et le motif.'],
              ['fa-reply', 'Confirmation', 'Nous validons la prise en charge et vous indiquons la marche à suivre.'],
              ['fa-box-open', 'Envoi du retour', 'Emballez soigneusement le livre et envoyez-le à l\'adresse indiquée.'],
              ['fa-money-bill-wave', 'Remboursement', 'Sous 30 jours après réception et vérification, par le même moyen de paiement.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="dlv-step">
                <div className="dlv-step__num">{i + 1}</div>
                <div className="dlv-step__icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ CONTACT ══════════ */}
        <div className="dlv-card dlv-card--cta">
          <div className="dlv-cta-content">
            <h2>Une question sur la livraison ou les retours ?</h2>
            <p>
              Notre équipe est disponible pour vous accompagner. Nous répondons généralement
              sous 24 heures.
            </p>
            <div className="dlv-contact-row">
              <a href="mailto:terrenoireeditions@gmail.com" className="dlv-contact-item">
                <i className="fas fa-envelope" /> terrenoireeditions@gmail.com
              </a>
              <a href="tel:+24165348887" className="dlv-contact-item">
                <i className="fas fa-phone" /> +241 65 34 88 87
              </a>
            </div>
            <div className="dlv-cta-btns">
              <Link to="/contact" className="dlv-btn dlv-btn--primary"><i className="fas fa-message" /> Nous contacter</Link>
              <Link to="/faq" className="dlv-btn dlv-btn--outline"><i className="fas fa-circle-question" /> FAQ</Link>
              <Link to="/catalog" className="dlv-btn dlv-btn--outline"><i className="fas fa-book" /> Catalogue</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Delivery;
