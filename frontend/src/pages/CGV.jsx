import { Link } from 'react-router-dom';
import '../styles/CGV.css';
import PageHero from '../components/ui/PageHero';

const LAST_UPDATED = '27 mai 2026';

const CGV = () => {
  return (
    <div className="cgv-page">
      <PageHero
        eyebrow="Informations légales"
        title="Conditions générales"
        accent="de vente"
        subtitle="Les présentes conditions régissent l'ensemble des ventes réalisées par Terre Noire Éditions."
      />

      <div className="cgv-content">
        <p className="cgv-intro">
          En passant commande sur notre site, vous acceptez sans réserve les présentes Conditions Générales de Vente.
          Dernière mise à jour : <strong>{LAST_UPDATED}</strong>.
        </p>

        {/* ── TABLE DES MATIERES ── */}
        <div className="cgv-card" style={{ marginBottom: 24, padding: '20px 28px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Sommaire</h2>
          <ol className="cgv-toc">
            {[
              'Identification du vendeur',
              'Objet et champ d\'application',
              'Produits',
              'Prix et fiscalité',
              'Commandes',
              'Moyens de paiement',
              'Livraison',
              'Droit de rétractation et retours',
              'Garanties',
              'Contenus numériques (ebooks)',
              'Propriété intellectuelle',
              'Responsabilité',
              'Données personnelles',
              'Règlement des litiges',
              'Dispositions finales',
            ].map((title, i) => (
              <li key={i}><a href={`#cgv-${i + 1}`}>{title}</a></li>
            ))}
          </ol>
        </div>

        <div className="cgv-card">

          {/* ── 1. IDENTIFICATION ── */}
          <h2 id="cgv-1">Article 1 — Identification du vendeur</h2>
          <div className="cgv-info-grid">
            <div className="cgv-info-row"><span>Dénomination sociale</span><strong>Terre Noire Éditions</strong></div>
            <div className="cgv-info-row"><span>Siège social</span><strong>Port-Gentil, Gabon</strong></div>
            <div className="cgv-info-row"><span>Email</span><strong><a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a></strong></div>
            <div className="cgv-info-row"><span>Téléphone</span><strong>+241 65 34 88 87</strong></div>
            <div className="cgv-info-row"><span>WhatsApp</span><strong>+241 76 59 35 35</strong></div>
            <div className="cgv-info-row"><span>Directeur de la publication</span><strong>Terre Noire Éditions</strong></div>
          </div>

          {/* ── 2. OBJET ── */}
          <h2 id="cgv-2">Article 2 — Objet et champ d&apos;application</h2>
          <p>
            Les présentes Conditions Générales de Vente (ci-après « CGV ») s&apos;appliquent à l&apos;ensemble des ventes
            de livres (format papier et numérique) réalisées par Terre Noire Éditions auprès de toute personne
            physique ou morale (ci-après « le Client ») via le site internet <strong>terrenoireeditions.com</strong>.
          </p>
          <p>
            Elles sont conclues conformément à la législation gabonaise en vigueur, notamment la
            <strong> Loi n° 025/2021 du 28 décembre 2021</strong> portant réglementation des transactions électroniques
            en République gabonaise, ainsi qu&apos;aux dispositions du droit commercial OHADA applicables.
          </p>
          <p>
            Toute commande implique l&apos;acceptation pleine et entière des présentes CGV. Terre Noire Éditions
            se réserve le droit de les modifier à tout moment ; les conditions applicables sont celles en vigueur
            au jour de la validation de la commande.
          </p>

          {/* ── 3. PRODUITS ── */}
          <h2 id="cgv-3">Article 3 — Produits</h2>
          <p>
            Terre Noire Éditions propose à la vente des ouvrages littéraires en deux formats :
          </p>
          <ul>
            <li><strong>Livres papier :</strong> ouvrages imprimés, neufs, livrés physiquement au Client.</li>
            <li><strong>Ebooks :</strong> ouvrages au format numérique (PDF), accessibles par téléchargement après achat.</li>
          </ul>
          <p>
            Les descriptions et photographies des produits sont aussi fidèles que possible. Toutefois,
            de légères variations (couleur de couverture, mise en page) peuvent exister entre la
            présentation en ligne et le produit reçu. Ces variations ne sauraient constituer un défaut
            de conformité.
          </p>
          <p>
            Les produits sont proposés dans la limite des stocks disponibles. En cas d&apos;indisponibilité
            après validation de la commande, le Client en sera informé dans les meilleurs délais et
            pourra choisir entre un remplacement ou un remboursement intégral.
          </p>

          {/* ── 4. PRIX ── */}
          <h2 id="cgv-4">Article 4 — Prix et fiscalité</h2>
          <p>
            Les prix sont indiqués en <strong>Francs CFA (XAF)</strong>, monnaie ayant cours légal dans la
            zone CEMAC. Ils sont exprimés toutes taxes comprises (TTC), incluant la Taxe sur la Valeur
            Ajoutée (TVA) au taux en vigueur en République gabonaise (<strong>18 %</strong>).
          </p>
          <p>
            Les frais de livraison ne sont pas inclus dans le prix des produits et sont calculés
            séparément lors de la commande (voir Article 7). Terre Noire Éditions se réserve le droit
            de modifier ses prix à tout moment. Les produits seront facturés sur la base des tarifs
            en vigueur au moment de la validation de la commande.
          </p>

          {/* ── 5. COMMANDES ── */}
          <h2 id="cgv-5">Article 5 — Commandes</h2>
          <p>Le processus de commande se déroule en quatre étapes :</p>
          <ol>
            <li><strong>Sélection :</strong> le Client ajoute les ouvrages souhaités à son panier.</li>
            <li><strong>Vérification :</strong> le Client vérifie le contenu de son panier, les quantités et les prix.</li>
            <li><strong>Paiement :</strong> le Client choisit son moyen de paiement et procède au règlement.</li>
            <li><strong>Confirmation :</strong> un email de confirmation récapitulant la commande est envoyé au Client.</li>
          </ol>
          <p>
            La validation de la commande vaut acceptation des prix, des quantités, de la nature
            des produits et des frais de livraison. Terre Noire Éditions se réserve le droit de
            refuser ou d&apos;annuler toute commande en cas de :
          </p>
          <ul>
            <li>Incident de paiement ou paiement non confirmé ;</li>
            <li>Adresse de livraison incomplète ou erronée ;</li>
            <li>Commande anormale ou suspicion de fraude ;</li>
            <li>Indisponibilité du produit après validation.</li>
          </ul>

          {/* ── 6. PAIEMENT ── */}
          <h2 id="cgv-6">Article 6 — Moyens de paiement</h2>
          <p>Le Client peut régler sa commande par les moyens suivants :</p>
          <ul>
            <li><strong>Moov Money :</strong> paiement mobile via le réseau Moov Africa Gabon.</li>
            <li><strong>Airtel Money :</strong> paiement mobile via le réseau Airtel Gabon.</li>
            <li><strong>BambooPay :</strong> paiement sur la page sécurisée de la plateforme BambooPay.</li>
          </ul>
          <p>
            Le paiement est exigible à la commande. Les transactions électroniques sont sécurisées.
            Le Client garantit qu&apos;il dispose des autorisations nécessaires pour utiliser le moyen
            de paiement choisi. En cas d&apos;échec ou de refus du paiement, la commande est automatiquement
            annulée.
          </p>

          {/* ── 7. LIVRAISON ── */}
          <h2 id="cgv-7">Article 7 — Livraison</h2>
          <h3>7.1 Zones desservies</h3>
          <p>
            Terre Noire Éditions livre les exemplaires physiques (livres papier) uniquement
            dans les trois villes suivantes : <strong>Libreville</strong>,{' '}
            <strong>Port-Gentil</strong> et <strong>Lambaréné</strong>.
          </p>
          <p>
            Le Client résidant en dehors de ces trois villes peut néanmoins passer commande.
            Dans ce cas, il devra venir retirer sa commande en main propre dans la ville
            desservie la plus proche. Terre Noire Éditions contactera le Client pour coordonner
            les modalités de retrait dès que la commande sera arrivée à destination.
          </p>
          <h3>7.2 Délais de livraison</h3>
          <p>Les délais estimés sont les suivants :</p>
          <ul>
            <li><strong>Port-Gentil :</strong> livraison sous 24 à 72 heures ouvrées.</li>
            <li><strong>Libreville :</strong> livraison sous 3 à 7 jours ouvrés.</li>
            <li><strong>Lambaréné :</strong> livraison sous 5 à 10 jours ouvrés.</li>
          </ul>
          <p>
            Les délais indiqués sont estimatifs. Terre Noire Éditions ne saurait être tenue
            responsable des retards dus au transporteur ou à un cas de force majeure.
          </p>
          <h3>7.3 Frais de livraison</h3>
          <p>
            Les frais de livraison sont calculés en fonction de la destination et du montant
            de la commande. Ils sont affichés au Client avant la validation de la commande.
            Un seuil de gratuité peut être appliqué ; les conditions en vigueur sont consultables
            sur la page panier au moment de la commande.
          </p>
          <p>
            Les ebooks (contenus numériques) ne sont pas soumis à des frais de livraison.
            Ils sont accessibles immédiatement après confirmation du paiement.
          </p>
          <h3>7.4 Transfert des risques</h3>
          <p>
            Le transfert des risques de perte ou d&apos;endommagement du produit intervient au moment
            de la remise du colis au Client. En cas de colis endommagé à la réception, le Client
            doit émettre des réserves auprès du transporteur et contacter Terre Noire Éditions
            dans un délai de 48 heures.
          </p>

          {/* ── 8. RETRACTATION ── */}
          <h2 id="cgv-8">Article 8 — Droit de rétractation et retours</h2>
          <h3>8.1 Livres papier</h3>
          <p>
            Conformément à l&apos;article 57 de la <strong>Loi n° 025/2021</strong>, le Client dispose d&apos;un
            délai de <strong>quatorze (14) jours calendaires</strong> à compter de la réception du
            produit pour exercer son droit de rétractation, sans avoir à justifier de motif
            ni à payer de pénalités.
          </p>
          <p>Pour exercer ce droit, le Client doit :</p>
          <ol>
            <li>Notifier sa décision par email à <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a> ou via le <Link to="/contact">formulaire de contact</Link>.</li>
            <li>Retourner le produit dans son état d&apos;origine : non lu, non annoté, non corné, non taché, avec son emballage.</li>
          </ol>
          <p>
            Les frais de retour sont à la charge du Client, sauf en cas de produit défectueux
            ou d&apos;erreur imputable à Terre Noire Éditions.
            Le remboursement est effectué dans un délai maximum de <strong>30 jours</strong> suivant
            la réception et la vérification du retour, par le même moyen de paiement que celui
            utilisé pour la commande.
          </p>
          <h3>8.2 Contenus numériques (ebooks)</h3>
          <p>
            Conformément à la loi, le droit de rétractation <strong>ne s&apos;applique pas</strong> aux
            contenus numériques fournis sans support matériel dont l&apos;exécution a commencé avec
            l&apos;accord préalable et exprès du Client. Lors de l&apos;achat d&apos;un ebook, le Client
            reconnaît expressément renoncer à son droit de rétractation dès le début du téléchargement.
          </p>
          <p>
            En cas de fichier défectueux ou inaccessible, Terre Noire Éditions s&apos;engage à
            renvoyer un lien de téléchargement fonctionnel dans les meilleurs délais.
          </p>

          {/* ── 9. GARANTIES ── */}
          <h2 id="cgv-9">Article 9 — Garanties</h2>
          <p>Tous les ouvrages vendus bénéficient :</p>
          <ul>
            <li>
              <strong>Garantie légale de conformité :</strong> le produit livré doit correspondre
              à la description et aux caractéristiques annoncées. En cas de défaut de conformité
              (pages manquantes, erreur d&apos;impression, produit différent de la commande), le Client
              peut demander le remplacement ou le remboursement du produit.
            </li>
            <li>
              <strong>Garantie des vices cachés :</strong> conformément au Code civil gabonais,
              Terre Noire Éditions est tenue des défauts cachés rendant le produit impropre à
              l&apos;usage auquel il est destiné.
            </li>
          </ul>
          <p>
            Pour faire valoir ces garanties, le Client doit contacter Terre Noire Éditions
            en fournissant une description du défaut constaté et, si possible, des photographies.
          </p>

          {/* ── 10. EBOOKS ── */}
          <h2 id="cgv-10">Article 10 — Contenus numériques (ebooks)</h2>
          <h3>10.1 Nature du contrat</h3>
          <p>
            L&apos;achat d&apos;un ebook confère au Client une <strong>licence d&apos;utilisation personnelle,
            non exclusive et non transférable</strong>. Le Client n&apos;acquiert pas la propriété
            intellectuelle de l&apos;œuvre mais un droit de lecture strictement personnel et privé.
          </p>
          <h3>10.2 Conditions d&apos;utilisation</h3>
          <ul>
            <li>L&apos;ebook est fourni au format PDF.</li>
            <li>Le téléchargement est accessible depuis l&apos;espace client après confirmation du paiement.</li>
            <li>Toute copie, redistribution, revente, prêt, mise à disposition publique ou modification du fichier est <strong>strictement interdite</strong>.</li>
            <li>L&apos;usage est réservé à un cadre strictement personnel et privé.</li>
          </ul>

          {/* ── 11. PROPRIETE INTELLECTUELLE ── */}
          <h2 id="cgv-11">Article 11 — Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus du site (textes, images, logos, maquettes, graphismes, charte
            graphique, base de données) sont protégés par le <strong>droit d&apos;auteur gabonais</strong> (Loi
            n° 1/87/PR du 29 juillet 1987) et par l&apos;<strong>Accord de Bangui</strong> de l&apos;Organisation
            Africaine de la Propriété Intellectuelle (OAPI).
          </p>
          <p>
            Les ouvrages publiés par Terre Noire Éditions sont des œuvres protégées. Toute
            reproduction, représentation, adaptation, traduction ou exploitation, totale ou
            partielle, par quelque procédé que ce soit, sans autorisation écrite préalable de
            Terre Noire Éditions ou des ayants droit, est illicite et constitue une contrefaçon
            sanctionnée par la loi.
          </p>
          <p>
            La marque « Terre Noire Éditions », son logo et ses éléments distinctifs sont protégés.
            Leur utilisation sans autorisation est interdite.
          </p>

          {/* ── 12. RESPONSABILITE ── */}
          <h2 id="cgv-12">Article 12 — Responsabilité</h2>
          <p>
            Terre Noire Éditions s&apos;engage à fournir des produits conformes à la commande et
            à mettre en œuvre tous les moyens nécessaires au bon fonctionnement du site.
          </p>
          <p>La responsabilité de Terre Noire Éditions ne saurait être engagée dans les cas suivants :</p>
          <ul>
            <li>Force majeure (événement imprévisible, irrésistible et extérieur, au sens du droit civil gabonais et du droit OHADA) ;</li>
            <li>Dysfonctionnement technique indépendant de sa volonté (interruption du réseau internet, du service d&apos;hébergement, etc.) ;</li>
            <li>Utilisation non conforme du produit par le Client ;</li>
            <li>Retard imputable au transporteur ;</li>
            <li>Inexactitude des informations fournies par le Client (adresse, téléphone).</li>
          </ul>
          <p>
            En tout état de cause, la responsabilité de Terre Noire Éditions est limitée au
            montant de la commande concernée. Les dommages indirects (perte de profit, perte
            de données, préjudice commercial) sont exclus sauf en cas de faute lourde ou intentionnelle.
          </p>

          {/* ── 13. DONNEES PERSONNELLES ── */}
          <h2 id="cgv-13">Article 13 — Données personnelles</h2>
          <p>
            Les données personnelles collectées lors de la commande (nom, email, adresse, téléphone)
            sont traitées conformément à la <strong>Loi n° 001/2011 du 25 septembre 2011</strong> relative
            à la protection des données à caractère personnel, modifiée par la <strong>Loi n° 025/2023
            du 9 juillet 2023</strong>.
          </p>
          <p>Ces données sont collectées pour les finalités suivantes :</p>
          <ul>
            <li>Traitement et suivi des commandes ;</li>
            <li>Gestion de la relation client ;</li>
            <li>Envoi de la newsletter (avec consentement préalable du Client) ;</li>
            <li>Amélioration de nos services.</li>
          </ul>
          <p>
            Le Client dispose d&apos;un droit d&apos;accès, de rectification et de suppression de ses données.
            Pour exercer ces droits, il peut contacter Terre Noire Éditions par email ou consulter
            notre <Link to="/privacy">politique de confidentialité</Link>.
          </p>
          <p>
            Les données ne sont jamais cédées à des tiers à des fins commerciales. Elles sont
            conservées pendant la durée nécessaire au traitement de la commande et à la gestion
            de la relation client, conformément à la réglementation en vigueur.
          </p>

          {/* ── 14. LITIGES ── */}
          <h2 id="cgv-14">Article 14 — Règlement des litiges</h2>
          <p>
            En cas de différend relatif à l&apos;interprétation ou à l&apos;exécution des présentes CGV,
            les parties s&apos;engagent à rechercher une solution amiable avant toute action judiciaire.
          </p>
          <p>Le règlement des litiges s&apos;effectue selon la procédure suivante :</p>
          <ol>
            <li>
              <strong>Réclamation amiable :</strong> le Client adresse sa réclamation par email à{' '}
              <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a> ou par
              téléphone au +241 65 34 88 87. Terre Noire Éditions s&apos;engage à répondre dans
              un délai de <strong>30 jours</strong>.
            </li>
            <li>
              <strong>Médiation :</strong> à défaut de résolution amiable, le Client peut saisir
              le Service de Sécurité des Consommateurs de la DGCCRF (Direction Générale de la
              Concurrence, de la Consommation et de la Répression des Fraudes du Gabon).
            </li>
            <li>
              <strong>Juridiction compétente :</strong> en dernier recours, tout litige sera soumis
              aux tribunaux compétents de la République gabonaise, conformément au droit gabonais
              et aux dispositions du droit OHADA.
            </li>
          </ol>

          {/* ── 15. DISPOSITIONS FINALES ── */}
          <h2 id="cgv-15">Article 15 — Dispositions finales</h2>
          <p>
            Si l&apos;une des clauses des présentes CGV était déclarée nulle ou inapplicable, les
            autres clauses conserveraient leur pleine validité et continueraient à s&apos;appliquer.
          </p>
          <p>
            Le fait pour Terre Noire Éditions de ne pas exercer un droit prévu par les présentes
            CGV ne constitue pas une renonciation à ce droit.
          </p>
          <p>
            Les présentes CGV sont rédigées en langue française. En cas de traduction, seule la
            version française fera foi.
          </p>
          <p>
            <strong>Droit applicable :</strong> les présentes CGV sont soumises au droit de la
            République gabonaise.
          </p>

          {/* ── CTA ── */}
          <div className="cgv-cta">
            <Link to="/contact" className="cgv-btn cgv-btn--primary">
              <i className="fas fa-envelope" style={{ marginRight: 8 }} />
              Nous contacter
            </Link>
            <Link to="/catalog" className="cgv-btn cgv-btn--outline">
              <i className="fas fa-book" style={{ marginRight: 8 }} />
              Retour au catalogue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CGV;
