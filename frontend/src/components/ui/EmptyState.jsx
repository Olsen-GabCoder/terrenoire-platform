import '../../styles/EmptyState.css';

/**
 * État vide / état d'erreur commun : panier, favoris, commandes, catalogue…
 * Même pictogramme, même titre, même bouton partout.
 */
const EmptyState = ({ icon = 'fa-book-open', title, text, tone = 'default', children }) => (
  <div className={`tn-empty ${tone === 'error' ? 'tn-empty--error' : ''}`.trim()} role={tone === 'error' ? 'alert' : undefined}>
    <div className="tn-empty__icon" aria-hidden="true"><i className={`fas ${icon}`} /></div>
    <h2 className="tn-empty__title">{title}</h2>
    {text && <p className="tn-empty__text">{text}</p>}
    {children && <div className="tn-empty__actions">{children}</div>}
  </div>
);

export default EmptyState;
