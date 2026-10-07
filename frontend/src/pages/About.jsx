import { Link } from 'react-router-dom';
import SectionSeparator from '../components/SectionSeparator';
import '../styles/About.css';
import PageHero from '../components/ui/PageHero';

const About = () => {
  return (
    <div className="about-page">

      {/* ══════════ HERO ══════════ */}
      <PageHero
        eyebrow="Maison d'édition littéraire africaine"
        title="Terre Noire"
        accent="Éditions"
        subtitle="Née en 2025 au cœur de Port-Gentil, capitale économique du Gabon, Terre Noire Éditions est bien plus qu'une maison d'édition. C'est un espace de création, de transmission et de valorisation de la pensée africaine, dans toute sa richesse et sa diversité."
      >
        <p className="about-hero__tagline">&laquo; Demain s&apos;écrit aujourd&apos;hui. &raquo;</p>
      </PageHero>

      {/* ══════════ MOT DE BIENVENUE ══════════ */}
      <div className="about-content">

        <div className="abt-card abt-card--welcome">
          <div className="abt-section-header">
            <span className="abt-section-num">01</span>
            <h2>Mot de bienvenue</h2>
          </div>
          <p>
            Nous croyons profondément que les histoires africaines méritent d&apos;être racontées,
            publiées et lues. C&apos;est pourquoi nous avons bâti un écosystème complet — de la plume
            à la page, de l&apos;imprimerie à la librairie — pour accompagner chaque auteur dans
            son aventure littéraire, avec rigueur et bienveillance.
          </p>
          <p>
            À travers nos collections, nos collaborations et notre engagement quotidien,
            nous donnons une voix et ouvrons une voie aux primo-auteurs comme aux plumes
            confirmées. Parce que la littérature africaine n&apos;est pas un genre parmi d&apos;autres,
            c&apos;est un continent entier à explorer.
          </p>
          <blockquote className="abt-quote">
            <i className="fas fa-quote-left" />
            L&apos;Afrique a tant à dire. Nous sommes là pour l&apos;écrire.
          </blockquote>
        </div>

        {/* ══════════ NOS ACTIVITES ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">02</span>
            <h2>Nos activités</h2>
          </div>
          <p>
            Terre Noire Éditions s&apos;est construite autour d&apos;un modèle unique et intégré :
            trois pôles complémentaires qui couvrent l&apos;ensemble du cycle de vie d&apos;un ouvrage,
            du manuscrit jusqu&apos;au lecteur final.
          </p>
          <div className="abt-activities">
            {[
              ['fa-book', 'La Maison d\'edition',
                'Au cœur de notre identité, la maison d\'édition est le lieu où les manuscrits deviennent des livres. Nous accompagnons nos auteurs tout au long du processus éditorial : lecture et sélection des textes, travail de correction et d\'amélioration, conception graphique des couvertures, mise en page professionnelle et suivi jusqu\'à la publication finale. Notre catalogue reflète la diversité de la littérature africaine : romans, poésies, nouvelles, essais, ouvrages de spiritualité et livres pour la jeunesse.'],
              ['fa-print', 'L\'Imprimerie',
                'Notre imprimerie interne est un atout stratégique qui nous distingue. En maîtrisant la production physique de nos ouvrages, nous garantissons des délais réduits, une qualité d\'impression constante et des coûts maîtrisés. Nous ouvrons nos presses aux maisons d\'édition partenaires, aux auteurs autoédités et à toute structure ayant besoin d\'une impression professionnelle de qualité. Chaque livre qui sort de nos ateliers porte notre exigence et notre fierté.'],
              ['fa-store', 'La Librairie',
                'Parce qu\'un livre doit trouver son lecteur, Terre Noire Éditions dispose de sa propre librairie à Port-Gentil. Espace de vente, mais aussi lieu de rencontres et d\'échanges, notre librairie est un point d\'ancrage culturel dans la ville. Nos ouvrages sont également distribués chez nos partenaires librairies à travers le Gabon.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="abt-activity">
                <div className="abt-activity__icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SectionSeparator direction="cream-to-cream" variant={1} />

        {/* ══════════ NOS COLLECTIONS ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">03</span>
            <h2>Nos collections</h2>
          </div>
          <p>
            Chaque collection est un univers à part entière. Construites autour d&apos;une thématique forte,
            d&apos;une identité visuelle propre et d&apos;une ligne éditoriale claire, elles offrent à chaque
            lecteur un espace qui lui ressemble. Nos collections ne sont pas figées — de nouvelles
            pourront être créées à tout moment.
          </p>
          <div className="abt-collections">
            {[
              ['Moughetou', 'Mot Bapunu — langue du Gabon', 'Roman · Nouvelles · Essai', '#C0392B',
                'Consacrée à l\'émancipation de la femme africaine, à la défense et à la valorisation de ses droits. Un espace de parole libre porté par des voix féminines courageuses. Elle interroge les silences imposés, les tabous sociaux et les injustices vécues, tout en célébrant la force, la dignité et la résilience des femmes du continent.'],
              ['Marabout', null, 'Poésie · Récit · Essai culturel', '#C8956C',
                'Dédiée aux luttes africaines, à la protection et à la transmission des valeurs, traditions, coutumes, cultures et civilisations du continent. Véritable acte de mémoire et de résistance culturelle, cette collection puise dans les racines profondes de l\'Afrique pour en célébrer la beauté, la complexité et la richesse.'],
              ['Une Vie d\'Onction', null, 'Foi chrétienne · Spiritualité · Dev. personnel', '#D4A017',
                'Un espace de recueillement, de croissance et de transformation intérieure. Ancrée dans la foi chrétienne, cette collection rassemble des ouvrages qui guident, élèvent et fortifient le lecteur dans sa vie spirituelle et dans sa relation à Dieu.'],
              ['Mwanna', 'Mot Omyene — langue du Gabon', 'Littérature jeunesse · Aventure · Éveil', '#27AE60',
                'Destinée aux enfants et adolescents de 3 à 16 ans, cette collection enchante et éveille les jeunes lecteurs africains à travers des récits adaptés à leur monde. Elle nourrit l\'imaginaire, développe le goût de la lecture dès le plus jeune âge et transmet des valeurs essentielles.'],
            ].map(([name, origin, genres, color, desc], i) => (
              <div key={i} className="abt-collection" style={{ borderLeftColor: color }}>
                <div className="abt-collection__header">
                  <h3 style={{ color }}>{name}</h3>
                  {origin && <span className="abt-collection__origin">{origin}</span>}
                  <span className="abt-collection__genres">{genres}</span>
                </div>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ MISSION & VISION ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">04</span>
            <h2>Mission &amp; Vision</h2>
          </div>
          <div className="abt-two-cols">
            <div>
              <h3><i className="fas fa-compass" /> Notre mission</h3>
              <p>
                Promouvoir la littérature africaine dans toute sa diversité, sa profondeur et sa vitalité.
                Nous croyons que les mots ont le pouvoir de changer les regards, de transformer les esprits
                et de tisser des ponts entre les générations, les cultures et les peuples.
              </p>
              <p>
                Notre engagement premier est de donner une voix et d&apos;ouvrir une voie aux primo-auteurs,
                ces écrivains en devenir qui portent des histoires puissantes mais n&apos;ont pas encore eu
                accès aux circuits traditionnels de l&apos;édition.
              </p>
            </div>
            <div>
              <h3><i className="fas fa-eye" /> Notre vision</h3>
              <p>
                Être reconnue, à l&apos;horizon de la prochaine décennie, comme l&apos;une des plus grandes et
                des plus influentes maisons d&apos;édition littéraires du continent africain. Non pas par la
                taille seule, mais par la qualité, l&apos;impact et la singularité de notre catalogue.
              </p>
              <p>
                Nous imaginons une Terre Noire Éditions dont les livres se lisent à Libreville comme
                à Dakar, à Abidjan comme à Nairobi, à Paris comme à Montréal. Une maison dont le nom
                évoque l&apos;excellence éditoriale africaine.
              </p>
            </div>
          </div>
        </div>

        <SectionSeparator direction="cream-to-cream" variant={2} />

        {/* ══════════ NOS VALEURS ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">05</span>
            <h2>Nos valeurs</h2>
          </div>
          <p>
            Trois valeurs fondamentales guident chacune de nos décisions, de nos publications
            et de nos relations.
          </p>
          <div className="abt-values">
            {[
              ['fa-fingerprint', 'Authenticité', '#E8601C',
                'Nous valorisons les récits sincères, les identités assumées et les expériences vécues. Chaque manuscrit que nous sélectionnons doit avoir cette qualité rare : la vérité. La vérité d\'un auteur qui a quelque chose à dire, qui le dit avec ses propres mots. C\'est ce qui fait qu\'un livre africain ne ressemble qu\'à lui-même.'],
              ['fa-gem', 'Rigueur', '#C8956C',
                'De la première lecture d\'un manuscrit à la livraison du livre imprimé, nous appliquons des standards élevés et non négociables. Un travail de correction attentif, une mise en page soignée, une impression de qualité. Nous croyons qu\'un livre bien fait est un acte de respect envers celui qui l\'écrit et celui qui le lit.'],
              ['fa-globe-africa', 'Africanité', '#27AE60',
                'Les cultures, les langues, les traditions et les civilisations africaines ont une valeur intrinsèque qui mérite d\'être préservée, célébrée et transmise. L\'Afrique est notre source, notre territoire et notre ambition. Tout ce que nous publions porte cette empreinte.'],
            ].map(([icon, title, color, desc], i) => (
              <div key={i} className="abt-value">
                <div className="abt-value__icon" style={{ background: `${color}12`, color }}><i className={`fas ${icon}`} /></div>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ NOS PARTENAIRES ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">06</span>
            <h2>Nos partenaires</h2>
          </div>
          <p>
            Nous cultivons des partenariats fondés sur la confiance, le respect mutuel et un objectif
            commun : développer et démocratiser l&apos;accès à la littérature africaine.
          </p>
          <div className="abt-partners">
            <div className="abt-partners__col">
              <h3><i className="fas fa-building" /> Maisons d&apos;édition</h3>
              <ul>
                <li>Origin Edition</li>
                <li>AfroBook Romance</li>
                <li>ArgentLivre</li>
              </ul>
            </div>
            <div className="abt-partners__col">
              <h3><i className="fas fa-store" /> Librairies</h3>
              <ul>
                <li>Librairie du Mapane</li>
                <li>Livre+</li>
                <li>Librairie Clé d&apos;Impact</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ══════════ CTA ══════════ */}
        <div className="abt-card abt-card--cta">
          <div className="abt-cta-content">
            <h2>Passez à l&apos;action</h2>
            <p className="abt-cta-sub">Votre histoire mérite d&apos;être publiée.</p>
            <p>
              Que vous soyez un auteur avec un manuscrit prêt, un projet en cours, ou simplement
              une idée qui cherche sa forme, contactez-nous. Et si vous êtes lecteur, découvrez
              notre catalogue et commandez dès aujourd&apos;hui.
            </p>
            <div className="abt-cta-btns">
              <Link to="/submit-manuscript" className="abt-btn abt-btn--primary">
                <i className="fas fa-feather" /> Soumettre un manuscrit
              </Link>
              <Link to="/catalog" className="abt-btn abt-btn--outline">
                <i className="fas fa-book-open" /> Explorer le catalogue
              </Link>
              <Link to="/contact" className="abt-btn abt-btn--outline">
                <i className="fas fa-envelope" /> Nous contacter
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;
