import '../../styles/PageHero.css';

/**
 * En-tête de page commun à tout le site.
 *
 * - Variante par défaut (« éditoriale ») : pages de contenu et de découverte.
 * - `compact` : pages de service (panier, commande, compte, connexion) où le
 *   contenu utile doit apparaître tout de suite, surtout sur mobile.
 *
 * Toujours suivi de la même frise : c'est l'unique transition entre l'en-tête
 * sombre et le contenu clair.
 */
const PageHero = ({
  eyebrow,
  icon,
  title,
  accent,
  subtitle,
  compact = false,
  className = '',
  children,
}) => (
  <>
    <section className={`tn-page-hero ${compact ? 'tn-page-hero--compact' : ''} ${className}`.trim()}>
      <div className="tn-motif-bg tn-page-hero__motif" aria-hidden="true" />
      <div className="tn-page-hero__glow" aria-hidden="true" />
      <div className="tn-page-hero__inner">
        {eyebrow && (
          <span className="tn-page-hero__eyebrow">
            {icon && <i className={`fas ${icon}`} aria-hidden="true" />}
            {eyebrow}
          </span>
        )}
        <h1 className="tn-page-hero__title">
          {title}
          {accent && <>{/[-'’]$/.test(title) ? '' : ' '}<em>{accent}</em></>}
        </h1>
        {subtitle && <p className="tn-page-hero__sub">{subtitle}</p>}
        {children}
      </div>
    </section>
    <div className="tn-motif-strip tn-page-hero__edge" aria-hidden="true" />
  </>
);

export default PageHero;
