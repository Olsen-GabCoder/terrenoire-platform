import { Link } from 'react-router-dom';
import '../styles/Privacy.css';

const LAST_UPDATED = '21 mai 2026';

const Privacy = () => {
  return (
    <div className="privacy-page">
      <section className="privacy-hero">
        <div className="privacy-hero__orb privacy-hero__orb--1" />
        <div className="privacy-hero__grid-bg" />
        <div className="privacy-hero__inner">
          <div className="privacy-hero__line" />
          <h1 className="privacy-hero__title">Politique de confidentialité</h1>
          <p className="privacy-hero__sub">
            Terre Noire Éditions s&apos;engage à protéger vos données personnelles conformément
            à la législation gabonaise en vigueur.
          </p>
        </div>
      </section>

      <div className="privacy-hero-fade" />

      <div className="privacy-content">
        <p className="prv-intro">
          La présente politique décrit comment Terre Noire Éditions collecte, utilise, conserve
          et protégé vos données personnelles. Dernière mise à jour : <strong>{LAST_UPDATED}</strong>.
        </p>

        {/* ── SOMMAIRE ── */}
        <div className="prv-card prv-card--toc">
          <div className="prv-toc-header">
            <i className="fas fa-shield-halved" />
            <h2>Sommaire</h2>
          </div>
          <ol className="prv-toc">
            {[
              'Responsable du traitement',
              'Cadre juridique',
              'Données collectées',
              'Finalités du traitement',
              'Base légale du traitement',
              'Destinataires des données',
              'Durée de conservation',
              'Sécurité des données',
              'Vos droits',
              'Cookies et traceurs',
              'Soumission de manuscrits',
              'Newsletter',
              'Mineurs',
              'Transfert de données',
              'Modification de la politique',
              'Contact',
            ].map((t, i) => (
              <li key={i}><a href={`#prv-${i + 1}`}>{t}</a></li>
            ))}
          </ol>
        </div>

        {/* ── 1. RESPONSABLE ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">01</span>
            <h2 id="prv-1">Responsable du traitement</h2>
          </div>
          <div className="prv-info-grid">
            <div className="prv-info-row"><span>Responsable</span><strong>Terre Noire Éditions</strong></div>
            <div className="prv-info-row"><span>Adresse</span><strong>Port-Gentil, Gabon</strong></div>
            <div className="prv-info-row"><span>Email</span><strong><a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a></strong></div>
            <div className="prv-info-row"><span>Téléphone</span><strong>+241 65 34 88 87</strong></div>
          </div>
          <p>
            Terre Noire Éditions est responsable du traitement des données personnelles
            collectées sur le site <strong>terrenoireeditions.com</strong> et de l&apos;ensemble
            des services associés (boutique en ligne, newsletter, soumission de manuscrits,
            formulaire de contact).
          </p>
        </div>

        {/* ── 2. CADRE JURIDIQUE ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">02</span>
            <h2 id="prv-2">Cadre juridique</h2>
          </div>
          <p>
            Le traitement des données personnelles par Terre Noire Éditions est effectué
            conformément aux textes suivants :
          </p>
          <ul className="prv-law-list">
            <li>
              <strong>Loi n° 001/2011 du 25 septembre 2011</strong> relative à la protection
              des données à caractère personnel en République gabonaise.
            </li>
            <li>
              <strong>Loi n° 025/2023 du 9 juillet 2023</strong> modifiant et complétant
              certaines dispositions de la loi 001/2011, alignant le Gabon sur les standards
              internationaux de protection des données.
            </li>
            <li>
              <strong>Loi n° 025/2021 du 28 décembre 2021</strong> portant réglementation des
              transactions électroniques en République gabonaise.
            </li>
          </ul>
          <div className="prv-highlight">
            <i className="fas fa-landmark" />
            <p>
              L&apos;autorité de controle compétente est l&apos;<strong>APDPVP</strong> (Autorité de
              Protection des Données Personnelles et de la Vie Privée du Gabon).
            </p>
          </div>
        </div>

        {/* ── 3. DONNEES COLLECTEES ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">03</span>
            <h2 id="prv-3">Données collectées</h2>
          </div>
          <p>
            Nous collectons uniquement les données strictement nécessaires à la fourniture
            de nos services. Voici les categories de données traitées :
          </p>

          <h3><i className="fas fa-user" /> Données d&apos;identification</h3>
          <ul>
            <li>Nom, prenom, pseudonyme (le cas echeant)</li>
            <li>Adresse email</li>
            <li>Numero de téléphone</li>
            <li>Photo de profil (facultatif)</li>
          </ul>

          <h3><i className="fas fa-map-marker-alt" /> Données de livraison</h3>
          <ul>
            <li>Adresse postale (rue, quartier, avenue)</li>
            <li>Ville</li>
            <li>Pays</li>
          </ul>

          <h3><i className="fas fa-shopping-bag" /> Données de commande</h3>
          <ul>
            <li>Historique des commandes (articles, quantités, montants)</li>
            <li>Moyen de paiement utilise (type uniquement, jamais les coordonnees bancaires)</li>
            <li>Codes promo utilises</li>
            <li>Adresse de livraison</li>
          </ul>

          <h3><i className="fas fa-laptop" /> Données de navigation</h3>
          <ul>
            <li>Adresse IP</li>
            <li>Type de navigateur et systeme d&apos;exploitation</li>
            <li>Pages consultees et durée de visite</li>
            <li>Cookies (voir section 10)</li>
          </ul>

          <h3><i className="fas fa-pen-to-square" /> Données de manuscrit</h3>
          <ul>
            <li>Titre, genre, langue, nombre de pages</li>
            <li>Fichier du manuscrit (PDF, DOCX)</li>
            <li>Description et synopsis</li>
          </ul>

          <div className="prv-highlight prv-highlight--green">
            <i className="fas fa-shield-halved" />
            <p>
              <strong>Nous ne collectons jamais :</strong> vos coordonnees bancaires completes,
              votre numero de carte, votre code PIN mobile money, ni aucune donnée biometrique.
              Les paiements sont traités par les opérateurs (Airtel, Moov, Visa) sur leurs
              propres plateformes sécurisées.
            </p>
          </div>
        </div>

        {/* ── 4. FINALITES ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">04</span>
            <h2 id="prv-4">Finalités du traitement</h2>
          </div>
          <div className="prv-purpose-grid">
            {[
              ['fa-bag-shopping', 'Gestion des commandes', 'Traitement, suivi, livraison et facturation de vos achats.'],
              ['fa-user-gear', 'Gestion du compte', 'Creation et administration de votre espace personnel.'],
              ['fa-headset', 'Relation client', 'Reponse a vos demandes, support technique, reclamations.'],
              ['fa-envelope', 'Communication', 'Envoi de newsletters, alertes nouveautes et promotions (avec votre consentement).'],
              ['fa-book-open', 'Sélection éditoriale', 'Examen des manuscrits soumis et suivi du processus éditorial.'],
              ['fa-chart-line', 'Amélioration', 'Analyse de l\'utilisation du site pour améliorer nos services.'],
              ['fa-gavel', 'Obligations légales', 'Respect de nos obligations comptables, fiscales et reglementaires.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="prv-purpose-item">
                <div className="prv-purpose-icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. BASE LEGALE ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">05</span>
            <h2 id="prv-5">Base légale du traitement</h2>
          </div>
          <p>Chaque traitement repose sur une base légale distincte :</p>
          <div className="prv-table-wrap">
            <table className="prv-table">
              <thead>
                <tr>
                  <th>Traitement</th>
                  <th>Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Commandes et paiements</td><td>Execution du contrat de vente</td></tr>
                <tr><td>Creation de compte</td><td>Execution du contrat (conditions d&apos;utilisation)</td></tr>
                <tr><td>Newsletter</td><td>Consentement explicite (double opt-in)</td></tr>
                <tr><td>Cookies analytiques</td><td>Consentement</td></tr>
                <tr><td>Formulaire de contact</td><td>Intérêt légitime (répondre a vos demandes)</td></tr>
                <tr><td>Soumission de manuscrit</td><td>Consentement et intérêt légitime</td></tr>
                <tr><td>Obligations comptables</td><td>Obligation légale</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 6. DESTINATAIRES ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">06</span>
            <h2 id="prv-6">Destinataires des données</h2>
          </div>
          <p>Vos données personnelles sont accessibles uniquement aux personnes et entites suivantes :</p>
          <ul>
            <li><strong>L&apos;équipe Terre Noire Éditions :</strong> personnel autorisé pour la gestion des commandes, du support client et du processus éditorial.</li>
            <li><strong>Prestataires de paiement :</strong> Airtel Money, Moov Money (Mobicash), Visa — pour le traitement sécurisé des transactions.</li>
            <li><strong>Prestataires techniques :</strong> hébergeur du site, service d&apos;envoi d&apos;emails — agissant en qualite de sous-traitants et lies par des obligations de confidentialité.</li>
            <li><strong>Transporteurs :</strong> pour la livraison de vos commandes (nom, adresse, téléphone).</li>
          </ul>
          <div className="prv-highlight">
            <i className="fas fa-ban" />
            <p>
              <strong>Vos données ne sont jamais vendues, louées ou cédées à des tiers à des fins
              commerciales ou publicitaires.</strong>
            </p>
          </div>
        </div>

        {/* ── 7. CONSERVATION ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">07</span>
            <h2 id="prv-7">Durée de conservation</h2>
          </div>
          <div className="prv-table-wrap">
            <table className="prv-table">
              <thead>
                <tr>
                  <th>Type de données</th>
                  <th>Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Données de compte client</td><td>Durée de vie du compte + 3 ans après dernière activité</td></tr>
                <tr><td>Données de commande</td><td>10 ans (obligations comptables et fiscales)</td></tr>
                <tr><td>Données de facturation</td><td>10 ans (obligation légale)</td></tr>
                <tr><td>Données de newsletter</td><td>Jusqu&apos;a désinscription + 30 jours</td></tr>
                <tr><td>Messages de contact</td><td>12 mois après clôture de la demande</td></tr>
                <tr><td>Manuscrits non retenus</td><td>12 mois après notification du refus</td></tr>
                <tr><td>Manuscrits acceptés</td><td>Durée du processus éditorial et contrat d&apos;edition</td></tr>
                <tr><td>Cookies</td><td>13 mois maximum</td></tr>
                <tr><td>Logs de connexion</td><td>12 mois</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            A l&apos;expiration de ces délais, les données sont supprimées ou anonymisées de
            manière irréversible.
          </p>
        </div>

        {/* ── 8. SECURITE ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">08</span>
            <h2 id="prv-8">Sécurité des données</h2>
          </div>
          <p>
            Terre Noire Éditions met en œuvre les mesures techniques et organisationnelles
            appropriées pour protéger vos données contre tout accès non autorisé, perte,
            alteration ou divulgation :
          </p>
          <div className="prv-security-grid">
            {[
              ['fa-lock', 'Chiffrement HTTPS', 'Toutes les communications entre votre navigateur et notre serveur sont chiffrees (TLS/SSL).'],
              ['fa-key', 'Authentification sécurisée', 'Mots de passe hashes, tokens JWT avec cookies HttpOnly, sessions sécurisées.'],
              ['fa-database', 'Accès restreint', 'Seul le personnel autorisé accède aux données, avec des niveaux de permissions différenciés.'],
              ['fa-shield-halved', 'Paiements sécurisés', 'Aucune coordonnée bancaire n\'est stockée sur nos serveurs. Les transactions sont traitées par les opérateurs agréés.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="prv-security-item">
                <i className={`fas ${icon}`} />
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 9. DROITS ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">09</span>
            <h2 id="prv-9">Vos droits</h2>
          </div>
          <p>
            Conformement à la <strong>Loi n° 001/2011 modifiée par la Loi n° 025/2023</strong>,
            vous disposez des droits suivants sur vos données personnelles :
          </p>
          <div className="prv-rights-grid">
            {[
              ['fa-eye', 'Droit d\'accès', 'Obtenir une copie de l\'ensemble des données personnelles que nous détenons à votre sujet.'],
              ['fa-pen', 'Droit de rectification', 'Faire corriger toute donnée inexacte ou incomplète vous concernant.'],
              ['fa-trash-can', 'Droit de suppression', 'Demander l\'effacement de vos données, sous reserve de nos obligations légales de conservation.'],
              ['fa-hand', 'Droit d\'opposition', 'Vous opposer au traitement de vos données pour des motifs légitimes, notamment pour la prospection.'],
              ['fa-pause', 'Droit à la limitation', 'Demander la suspension du traitement de vos données dans certains cas prevus par la loi.'],
              ['fa-download', 'Droit à la portabilité', 'Recevoir vos données dans un format structuré et couramment utilisé.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="prv-right-item">
                <div className="prv-right-icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="prv-highlight">
            <i className="fas fa-envelope" />
            <p>
              Pour exercer vos droits, adressez votre demande par email a{' '}
              <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a>{' '}
              en joignant une copie de votre piece d&apos;identité. Nous nous engageons a répondre
              dans un délai de <strong>30 jours</strong>.
            </p>
          </div>
          <p>
            En cas de litige, vous pouvez introduire une réclamation auprès de l&apos;APDPVP
            (Autorité de Protection des Données Personnelles et de la Vie Privée du Gabon).
          </p>
        </div>

        {/* ── 10. COOKIES ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">10</span>
            <h2 id="prv-10">Cookies et traceurs</h2>
          </div>
          <p>
            Notre site utilise des cookies — de petits fichiers texte déposés sur votre
            appareil — pour assurer son bon fonctionnement et améliorer votre experience.
          </p>
          <div className="prv-table-wrap">
            <table className="prv-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Finalite</th>
                  <th>Durée</th>
                  <th>Consentement</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Essentiels</strong></td><td>Authentification, panier, sécurité</td><td>Session / 12h</td><td>Non requis</td></tr>
                <tr><td><strong>Preferences</strong></td><td>Langue, theme, paramètres d&apos;affichage</td><td>12 mois</td><td>Non requis</td></tr>
                <tr><td><strong>Analytiques</strong></td><td>Statistiques de fréquentation, pages vues</td><td>13 mois</td><td>Requis</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Vous pouvez gerer vos préférences de cookies à tout moment via les paramètres
            de votre navigateur. La desactivation de certains cookies peut affecter le
            fonctionnement du site. Pour en savoir plus, consultez notre{' '}
            <Link to="/cookies">politique de cookies</Link>.
          </p>
        </div>

        {/* ── 11. MANUSCRITS ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">11</span>
            <h2 id="prv-11">Soumission de manuscrits</h2>
          </div>
          <p>
            Lorsque vous soumettez un manuscrit via notre formulaire, les données suivantes
            sont collectées : nom, prenom, pseudonyme, email, téléphone, pays, genre littéraire,
            langue, description et fichier du manuscrit.
          </p>
          <ul>
            <li>Ces données sont utilisées <strong>exclusivement</strong> pour le processus de sélection éditoriale.</li>
            <li>Le comite de lecture examiné votre œuvre et vous contacte par email dans un délai indicatif de 2 a 4 semaines.</li>
            <li>Les manuscrits non retenus sont conserves <strong>12 mois</strong> puis definitivement supprimés.</li>
            <li>Les manuscrits acceptes sont conserves pour la durée du processus éditorial.</li>
            <li>Vous pouvez demander le retrait de votre manuscrit à tout moment par email.</li>
          </ul>
        </div>

        {/* ── 12. NEWSLETTER ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">12</span>
            <h2 id="prv-12">Newsletter</h2>
          </div>
          <p>
            L&apos;inscription à notre newsletter est basee sur votre <strong>consentement
            explicite</strong> via un mécanisme de double opt-in :
          </p>
          <ol>
            <li>Vous saisissez votre email dans le formulaire d&apos;inscription.</li>
            <li>Un email de confirmation vous est envoyé.</li>
            <li>Vous cliquez sur le lien de confirmation pour activer votre abonnement.</li>
          </ol>
          <p>
            Vous pouvez vous desinscrire à tout moment en cliquant sur le lien
            « Se desinscrire » present en bas de chaque email, ou en nous contactant
            directement. La désinscription est effective immediatement et sans frais.
          </p>
          <p>
            Seule votre adresse email est conservée pour l&apos;envoi de la newsletter.
            Elle est supprimée 30 jours après votre désinscription.
          </p>
        </div>

        {/* ── 13. MINEURS ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">13</span>
            <h2 id="prv-13">Mineurs</h2>
          </div>
          <p>
            Le site Terre Noire Éditions ne s&apos;adresse pas spécifiquement aux mineurs.
            Les personnes de moins de 18 ans doivent obtenir le consentement de leur
            representant legal avant de créer un compte, passer commande ou soumettre
            des données personnelles.
          </p>
          <p>
            Si nous apprenons que des données ont ete collectées auprès d&apos;un mineur
            sans le consentement de son representant legal, nous les supprimerons dans
            les meilleurs délais.
          </p>
        </div>

        {/* ── 14. TRANSFERT ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">14</span>
            <h2 id="prv-14">Transfert de données</h2>
          </div>
          <p>
            Dans le cadre de nos services, certaines données peuvent être traitées
            par des prestataires situés en dehors du Gabon (hébergement, envoi d&apos;emails).
            Le cas echeant, nous nous assurons que ces prestataires offrent un niveau
            de protection adéquat conformement à la législation gabonaise.
          </p>
          <p>
            Conformement à la <strong>Loi n° 025/2021</strong>, une copie des données
            relatives aux transactions électroniques ayant une implication au Gabon
            est conservée sur le territoire national.
          </p>
        </div>

        {/* ── 15. MODIFICATION ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">15</span>
            <h2 id="prv-15">Modification de la politique</h2>
          </div>
          <p>
            Terre Noire Éditions se reserve le droit de modifier la présente politique
            de confidentialité à tout moment, afin de la mettre en conformite avec
            les evolutions legislatives ou les changements dans nos pratiques.
          </p>
          <p>
            En cas de modification substantielle, les utilisateurs inscrits en seront
            informes par email. La version en vigueur est celle publiee sur cette page
            avec la date de dernière mise à jour indiquee en haut de page.
          </p>
        </div>

        {/* ── 16. CONTACT ── */}
        <div className="prv-card prv-card--contact">
          <div className="prv-section-header">
            <span className="prv-section-num">16</span>
            <h2 id="prv-16">Contact</h2>
          </div>
          <p>
            Pour toute question relative à la protection de vos données personnelles
            ou pour exercer vos droits, contactez-nous :
          </p>
          <div className="prv-contact-grid">
            <a href="mailto:terrenoireeditions@gmail.com" className="prv-contact-item">
              <i className="fas fa-envelope" />
              <span>terrenoireeditions@gmail.com</span>
            </a>
            <a href="tel:+24165348887" className="prv-contact-item">
              <i className="fas fa-phone" />
              <span>+241 65 34 88 87</span>
            </a>
            <Link to="/contact" className="prv-contact-item">
              <i className="fas fa-message" />
              <span>Formulaire de contact</span>
            </Link>
          </div>
          <div className="prv-cta">
            <Link to="/cgv" className="prv-btn prv-btn--outline">
              <i className="fas fa-file-contract" /> Voir les CGV
            </Link>
            <Link to="/cookies" className="prv-btn prv-btn--outline">
              <i className="fas fa-cookie-bite" /> Politique de cookies
            </Link>
            <Link to="/catalog" className="prv-btn prv-btn--primary">
              <i className="fas fa-book" /> Retour au catalogue
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Privacy;
