import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/FAQ.css';

const FAQ_CATEGORIES = [
  {
    id: 'commandes', icon: 'fa-bag-shopping', label: 'Commandes & Paiement',
    items: [
      { q: 'Comment passer une commande ?', a: 'Parcourez notre catalogue, ajoutez les livres souhaités à votre panier, puis cliquez sur « Procéder au paiement ». Renseignez vos coordonnées et votre adresse de livraison, choisissez votre moyen de paiement et validez. Vous recevrez une confirmation par email avec le détail de votre commande.' },
      { q: 'Quels moyens de paiement acceptez-vous ?', a: 'Nous acceptons Moov Money et Airtel Money (vous validez le paiement directement sur votre téléphone), ainsi que BambooPay (paiement sur la page sécurisée BambooPay).' },
      { q: 'Comment utiliser un code promo ?', a: 'Dans votre panier, saisissez votre code promo dans le champ prévu et cliquez sur « Appliquer ». La réduction est immédiatement calculée et affichée avant validation. Un code promo ne peut être utilisé qu\'une seule fois et ne peut pas être combiné avec un autre code.' },
      { q: 'Comment suivre ma commande ?', a: 'Une fois votre commande expédiée, vous recevez un email avec les informations de suivi. Vous pouvez aussi consulter l\'état de vos commandes dans votre espace client (Mon compte > Mes commandes) après connexion.' },
      { q: 'Puis-je annuler ma commande ?', a: 'Oui, tant que votre commande est au statut « En attente » (avant paiement confirmé). Rendez-vous dans Mes commandes et cliquez sur « Annuler ». Une fois le paiement confirmé ou la commande expédiée, l\'annulation n\'est plus possible — vous pouvez alors exercer votre droit de rétractation.' },
      { q: 'Comment télécharger ma facture ?', a: 'Rendez-vous dans votre espace client > Mes commandes, cliquez sur la commande concernée puis sur « Télécharger la facture ». La facture est au format PDF.' },
    ],
  },
  {
    id: 'livraison', icon: 'fa-truck', label: 'Livraison',
    items: [
      { q: 'Quels sont les délais de livraison ?', a: 'Les commandes sont expédiées sous 5 à 10 jours ouvrés au Gabon. Pour Port-Gentil et environs : 5 à 7 jours. Pour les autres villes (Libreville, Lambaréné, Franceville, Mouila, Oyem) : 7 à 10 jours. Vous recevez un email de suivi dès l\'expédition.' },
      { q: 'Quels sont les frais de livraison ?', a: 'Les frais de livraison dépendent du montant de votre commande. Un seuil de gratuité peut s\'appliquer. Les frais sont calculés automatiquement lors du passage en caisse et affichés avant validation. Les ebooks ne sont pas soumis à des frais de livraison.' },
      { q: 'Livrez-vous en dehors du Gabon ?', a: 'Pour l\'instant, nos livraisons sont limitées au Gabon. Nous travaillons à étendre notre service à d\'autres pays de la sous-région. Inscrivez-vous à notre newsletter pour être informé des évolutions.' },
      { q: 'Que faire si mon colis arrive endommagé ?', a: 'Émettez des réserves auprès du transporteur à la réception, puis contactez-nous dans un délai de 48 heures par email ou via le formulaire de contact, en joignant des photos du colis et du livre endommagé. Nous procéderons au remplacement ou au remboursement à nos frais.' },
    ],
  },
  {
    id: 'retours', icon: 'fa-rotate-left', label: 'Retours & Remboursement',
    items: [
      { q: 'Puis-je retourner un livre ?', a: 'Oui. Conformément à la loi gabonaise (Loi n° 025/2021), vous disposez de 14 jours calendaires à compter de la réception pour exercer votre droit de rétractation, sans avoir à justifier de motif.' },
      { q: 'Quelles sont les conditions de retour ?', a: 'Le livre doit être en parfait état : non lu, non annoté, non corné, non taché, avec son emballage d\'origine. Les retours pour défaut d\'impression, livre endommagé à la livraison ou erreur de notre part sont à notre charge.' },
      { q: 'Comment effectuer un retour ?', a: 'Contactez-nous par email à terrenoireeditions@gmail.com ou via le formulaire de contact en précisant votre numéro de commande et le motif du retour. Nous vous indiquerons la marche à suivre.' },
      { q: 'Quel est le délai de remboursement ?', a: 'Le remboursement est effectué dans un délai maximum de 30 jours suivant la réception et la vérification du retour, par le même moyen de paiement que celui utilisé lors de la commande.' },
      { q: 'Puis-je retourner un ebook ?', a: 'Non. Le droit de rétractation ne s\'applique pas aux contenus numériques dont le téléchargement a commencé. En cas de fichier défectueux ou inaccessible, nous renvoyons un lien fonctionnel dans les meilleurs délais.' },
    ],
  },
  {
    id: 'ebooks', icon: 'fa-tablet-screen-button', label: 'Ebooks',
    items: [
      { q: 'Comment acheter et accéder à un ebook ?', a: 'Achetez l\'ebook comme un livre papier. Après confirmation du paiement, il est immédiatement accessible depuis votre espace client via la liseuse intégrée au site. Aucun téléchargement de logiciel n\'est nécessaire.' },
      { q: 'Quel format pour les ebooks ?', a: 'Nos ebooks sont au format PDF, lisible sur tous les appareils (ordinateur, tablette, smartphone, liseuse compatible PDF).' },
      { q: 'Puis-je partager ou revendre un ebook ?', a: 'Non. L\'achat d\'un ebook confère une licence d\'utilisation personnelle, non exclusive et non transférable. Toute copie, redistribution, revente ou mise à disposition publique est strictement interdite.' },
      { q: 'Pendant combien de temps ai-je accès à mon ebook ?', a: 'Votre ebook reste accessible depuis votre espace client tant que votre compte est actif. Il n\'y a pas de limite de temps.' },
    ],
  },
  {
    id: 'compte', icon: 'fa-user', label: 'Compte & Profil',
    items: [
      { q: 'Comment créer un compte ?', a: 'Cliquez sur « S\'inscrire » dans le menu, renseignez votre nom, prénom, adresse email et un mot de passe. Vous recevrez un email de bienvenue. L\'inscription est gratuite.' },
      { q: 'Que faire si j\'oublie mon mot de passe ?', a: 'Cliquez sur « Mot de passe oublié » sur la page de connexion, entrez votre adresse email, et vous recevrez un lien de réinitialisation. Ce lien est valable pour une durée limitée.' },
      { q: 'Comment modifier mon profil ?', a: 'Connectez-vous, puis accédez à « Mon profil ». Vous pouvez modifier votre nom, prénom, adresse, numéro de téléphone, ville et photo de profil à tout moment.' },
      { q: 'Comment supprimer mon compte ?', a: 'Contactez-nous par email à terrenoireeditions@gmail.com pour demander la suppression de votre compte. La suppression est effective sous 30 jours. Les données de facturation sont conservées conformément aux obligations légales.' },
    ],
  },
  {
    id: 'manuscrits', icon: 'fa-feather', label: 'Soumission de manuscrits',
    items: [
      { q: 'Comment soumettre un manuscrit ?', a: 'Rendez-vous sur la page « Soumettre un manuscrit » et remplissez le formulaire en joignant votre fichier (PDF ou DOCX). Aucune inscription n\'est nécessaire pour soumettre.' },
      { q: 'Quels genres acceptez-vous ?', a: 'Nous acceptons les manuscrits dans tous les genres : Roman, Nouvelle, Poésie, Essai, Théâtre, Littérature jeunesse, Bande dessinée et Autre. Les manuscrits peuvent être en français, anglais, arabe, portugais ou espagnol.' },
      { q: 'Quel est le délai de réponse ?', a: 'Notre comité de lecture examine chaque proposition et vous contacte par email sous 2 à 4 semaines (délai indicatif). La décision du comité est souveraine et définitive.' },
      { q: 'Puis-je retirer mon manuscrit ?', a: 'Oui, vous pouvez demander le retrait de votre manuscrit à tout moment par email. Les manuscrits non retenus sont conservés 12 mois puis définitivement supprimés.' },
    ],
  },
  {
    id: 'newsletter', icon: 'fa-envelope', label: 'Newsletter',
    items: [
      { q: 'Comment s\'abonner à la newsletter ?', a: 'Saisissez votre adresse email dans le formulaire en bas de page et cliquez sur « S\'abonner ». Vous recevrez un email de confirmation — cliquez sur le lien pour activer votre abonnement (double opt-in).' },
      { q: 'Comment se désinscrire ?', a: 'Cliquez sur le lien « Se désinscrire » présent en bas de chaque email de newsletter. La désinscription est immédiate et sans frais. Vous pouvez aussi nous contacter par email.' },
      { q: 'Quelle est la fréquence d\'envoi ?', a: 'Nous envoyons une newsletter lors de chaque nouvelle parution ou promotion. Pas de spam — nous respectons votre boîte de réception.' },
    ],
  },
  {
    id: 'wishlist', icon: 'fa-heart', label: 'Liste d\'envie',
    items: [
      { q: 'Comment fonctionne la liste d\'envie ?', a: 'Cliquez sur le cœur sur la couverture d\'un livre pour l\'ajouter à votre liste d\'envie. Vous pouvez la consulter à tout moment depuis le menu « Favoris ».' },
      { q: 'Faut-il être connecté ?', a: 'Non. Votre liste est sauvegardée localement sur votre appareil. Si vous vous connectez, elle est automatiquement synchronisée avec votre compte et accessible depuis tout appareil.' },
      { q: 'L\'ajout en favoris réserve-t-il le livre ?', a: 'Non. L\'ajout à la liste d\'envie ne constitue ni une réservation ni une garantie de disponibilité.' },
    ],
  },
  {
    id: 'avis', icon: 'fa-star', label: 'Avis & Notes',
    items: [
      { q: 'Comment laisser un avis sur un livre ?', a: 'Connectez-vous, allez sur la fiche du livre, puis descendez dans l\'onglet « Avis ». Attribuez une note de 1 à 5 étoiles et rédigez votre commentaire. Un seul avis par livre et par utilisateur.' },
      { q: 'Puis-je modifier ou supprimer mon avis ?', a: 'Oui. Depuis la fiche du livre, cliquez sur le menu (trois points) à côté de votre avis pour le modifier ou le supprimer.' },
      { q: 'Puis-je répondre aux avis des autres ?', a: 'Oui. Sous chaque avis, un bouton « Répondre » permet d\'engager la discussion avec les autres lecteurs.' },
    ],
  },
  {
    id: 'collections', icon: 'fa-book-open', label: 'Nos collections',
    items: [
      { q: 'Qu\'est-ce que la collection Moughetou ?', a: 'Mot Bapunu (langue du Gabon). Consacrée à l\'émancipation de la femme africaine, à la défense et à la valorisation de ses droits. Genres : Roman, Nouvelles, Essai.' },
      { q: 'Qu\'est-ce que la collection Marabout ?', a: 'Dédiée aux luttes africaines, à la protection et à la transmission des valeurs, traditions, coutumes, cultures et civilisations du continent. Genres : Poésie, Récit, Essai culturel.' },
      { q: 'Qu\'est-ce que la collection Une Vie d\'Onction ?', a: 'Un espace de recueillement, de croissance et de transformation intérieure, ancré dans la foi chrétienne. Genres : Spiritualité, Développement personnel.' },
      { q: 'Qu\'est-ce que la collection Mwanna ?', a: 'Mot Omyene (langue du Gabon). Destinée aux enfants et adolescents de 3 à 16 ans. Genres : Littérature jeunesse, Aventure, Éveil.' },
    ],
  },
  {
    id: 'contact', icon: 'fa-headset', label: 'Contact & Support',
    items: [
      { q: 'Comment vous contacter ?', a: 'Par email : terrenoireeditions@gmail.com. Par téléphone : +241 65 34 88 87. Via WhatsApp : +241 76 59 35 35. Ou via le formulaire de contact sur notre site.' },
      { q: 'Quel est le délai de réponse ?', a: 'Nous répondons généralement sous 24 heures (jours ouvrés).' },
      { q: 'Où êtes-vous situés ?', a: 'À Port-Gentil, Gabon. Nos ouvrages sont également disponibles chez nos librairies partenaires : Librairie du Mapane, Livre+ et Librairie Clé d\'Impact.' },
    ],
  },
];

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [openKey, setOpenKey] = useState(null);
  const [search, setSearch] = useState('');

  const filteredCategories = FAQ_CATEGORIES
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => {
        if (search.trim()) {
          const q = search.toLowerCase();
          return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
        }
        return true;
      }),
    }))
    .filter(cat => cat.items.length > 0)
    .filter(cat => activeCategory === 'all' || cat.id === activeCategory);

  const totalQuestions = FAQ_CATEGORIES.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="faq-page">
      <section className="faq-hero">
        <div className="faq-hero__orb faq-hero__orb--1" />
        <div className="faq-hero__orb faq-hero__orb--2" />
        <div className="faq-hero__grid-bg" />
        <div className="faq-hero__inner">
          <span className="faq-hero__pill"><i className="fas fa-circle-question" /> {totalQuestions} questions</span>
          <div className="faq-hero__line" />
          <h1 className="faq-hero__title">Questions <span className="faq-hero__title-accent">fréquentes</span></h1>
          <p className="faq-hero__sub">Retrouvez les réponses à toutes vos questions sur nos livres, commandes et services.</p>
          <div className="faq-search">
            <i className="fas fa-search" />
            <input type="text" placeholder="Rechercher une question..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} aria-label="Effacer"><i className="fas fa-times" /></button>}
          </div>
        </div>
      </section>

      <div className="faq-hero-fade" />

      <div className="faq-content">
        {/* Category pills */}
        <div className="faq-cats">
          <button className={`faq-cat ${activeCategory === 'all' ? 'faq-cat--active' : ''}`} onClick={() => setActiveCategory('all')}>
            <i className="fas fa-grid-2" /> Toutes
          </button>
          {FAQ_CATEGORIES.map(cat => (
            <button key={cat.id} className={`faq-cat ${activeCategory === cat.id ? 'faq-cat--active' : ''}`} onClick={() => setActiveCategory(cat.id)}>
              <i className={`fas ${cat.icon}`} /> {cat.label}
            </button>
          ))}
        </div>

        {/* Questions par categorie */}
        {filteredCategories.length === 0 && (
          <div className="faq-empty">
            <i className="fas fa-search" />
            <h3>Aucun résultat</h3>
            <p>Essayez avec d&apos;autres termes ou <Link to="/contact">contactez-nous</Link>.</p>
          </div>
        )}

        {filteredCategories.map(cat => (
          <div key={cat.id} className="faq-section">
            <div className="faq-section__header">
              <div className="faq-section__icon"><i className={`fas ${cat.icon}`} /></div>
              <h2>{cat.label}</h2>
              <span className="faq-section__count">{cat.items.length}</span>
            </div>
            <div className="faq-section__items">
              {cat.items.map((item, i) => {
                const key = `${cat.id}-${i}`;
                const isOpen = openKey === key;
                return (
                  <div key={key} className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
                    <button type="button" className="faq-item__header" aria-expanded={isOpen} aria-controls={`faq-content-${key}`} onClick={() => setOpenKey(isOpen ? null : key)}>
                      <h3 className="faq-item__q">{item.q}</h3>
                      <span className="faq-item__icon"><i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} /></span>
                    </button>
                    <div id={`faq-content-${key}`} className="faq-item__body" hidden={!isOpen}><p>{item.a}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="faq-cta-card">
          <div>
            <h2>Vous n&apos;avez pas trouvé votre réponse ?</h2>
            <p>Notre équipe est disponible pour vous aider.</p>
          </div>
          <div className="faq-cta-btns">
            <Link to="/contact" className="faq-btn faq-btn--primary"><i className="fas fa-envelope" /> Nous contacter</Link>
            <Link to="/delivery" className="faq-btn faq-btn--outline"><i className="fas fa-truck" /> Livraison & Retours</Link>
          </div>
        </div>
      </div>
      <div className="faq-footer-fade" />
    </div>
  );
};

export default FAQ;
