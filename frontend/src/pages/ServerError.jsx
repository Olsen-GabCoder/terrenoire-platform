import { useNavigate } from 'react-router-dom';
import '../styles/ServerError.css';

const ServerError = () => {
  const navigate = useNavigate();

  return (
    <div className="srv-err-page">
      <section className="srv-err-hero">
        <div className="srv-err-hero__orb" />
        <div className="srv-err-hero__grid-bg" />
        <div className="srv-err-hero__inner">
          <div className="srv-err-hero__code">500</div>
          <div className="srv-err-hero__line" />
          <h1 className="srv-err-hero__title">Nos serveurs lisent trop intensément</h1>
          <p className="srv-err-hero__sub">
            Une difficulté technique nous empêche d&apos;afficher cette page. Le problème est temporaire.
          </p>
          <blockquote className="srv-err-hero__quote">
            « Tout est silence dans une bibliothèque qui brûle. »
            <cite>— Adaptation du proverbe Hampâté Bâ</cite>
          </blockquote>
          <div className="srv-err-hero__actions">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="srv-err-btn srv-err-btn--primary"
            >
              <i className="fas fa-rotate-right" /> Réessayer
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="srv-err-btn srv-err-btn--outline"
            >
              <i className="fas fa-book-open" /> Revenir à la couverture
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServerError;
