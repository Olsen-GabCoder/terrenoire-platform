import { Link } from 'react-router-dom';
import '../styles/NotFound.css';

const NotFound = () => (
  <div className="notfound-page">
    <section className="notfound-hero">
      <div className="notfound-hero__orb notfound-hero__orb--1" />
      <div className="notfound-hero__grid-bg" />
      <div className="notfound-hero__inner">
        <div className="notfound-hero__code">404</div>
        <div className="notfound-hero__line" />
        <h1 className="notfound-hero__title">La page s&apos;est égarée</h1>
        <p className="notfound-hero__sub">
          Cette page n&apos;existe plus ou n&apos;a jamais existé. Comme certains livres rares, elle s&apos;est dérobée à notre catalogue.
        </p>
        <blockquote className="notfound-quote">
          « Les choses s&apos;effondrent. »
          <cite>— Chinua Achebe</cite>
        </blockquote>
        <div className="notfound-hero__actions">
          <Link to="/" className="notfound-btn notfound-btn--primary">
            <i className="fas fa-book-open" /> Revenir à la couverture
          </Link>
          <Link to="/catalog" className="notfound-btn notfound-btn--outline">
            <i className="fas fa-compass" /> Explorer le catalogue
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export default NotFound;
