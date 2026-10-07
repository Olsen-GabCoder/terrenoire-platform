import { Link } from 'react-router-dom';
import '../../styles/CheckoutSteps.css';

const STEPS = [
  { id: 'cart', label: 'Panier', to: '/cart' },
  { id: 'checkout', label: 'Livraison & paiement', short: 'Commande', to: '/checkout' },
  { id: 'payment', label: 'Validation', short: 'Validation' },
];

/** Repère d'étapes du tunnel d'achat : Panier → Commande → Validation. */
const CheckoutSteps = ({ current }) => {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <nav className="tn-steps" aria-label="Étapes de la commande">
      <ol className="tn-steps__list">
        {STEPS.map((step, i) => {
          const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
          const content = (
            <>
              <span className="tn-steps__dot" aria-hidden="true">
                {state === 'done' ? <i className="fas fa-check" /> : i + 1}
              </span>
              <span className="tn-steps__label">
                <span className="tn-steps__label-long">{step.label}</span>
                <span className="tn-steps__label-short">{step.short || step.label}</span>
              </span>
            </>
          );
          return (
            <li key={step.id} className={`tn-steps__item tn-steps__item--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              {state === 'done' && step.to ? <Link to={step.to} className="tn-steps__link">{content}</Link> : <span className="tn-steps__link">{content}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default CheckoutSteps;
