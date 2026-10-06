import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import bookService from '../services/bookService';
import api from '../services/api';
import BookCard from '../components/BookCard';
import { TnBookCover } from '../components/ui';
import SectionSeparator from '../components/SectionSeparator';
import useReveal from '../hooks/useReveal';
import useParallax from '../hooks/useParallax';
import useCountUp from '../hooks/useCountUp';
import HERO_TAGLINES from '../config/heroTaglines';
import '../styles/Home.css';

/* ── Hook : mot qui alterne avec effet typing ── */
function useTypingWords(words, typingSpeed = 80, pauseMs = 2800) {
  const [display, setDisplay] = useState(words[0]);
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState('pause'); // pause | erasing | typing

  useEffect(() => {
    let timeout;
    const currentWord = words[wordIndex];
    const nextIndex = (wordIndex + 1) % words.length;
    const nextWord = words[nextIndex];

    if (phase === 'pause') {
      timeout = setTimeout(() => setPhase('erasing'), pauseMs);
    } else if (phase === 'erasing') {
      if (display.length > 0) {
        timeout = setTimeout(() => setDisplay(d => d.slice(0, -1)), typingSpeed / 1.5);
      } else {
        setWordIndex(nextIndex);
        setPhase('typing');
      }
    } else if (phase === 'typing') {
      if (display.length < nextWord.length) {
        timeout = setTimeout(() => setDisplay(nextWord.slice(0, display.length + 1)), typingSpeed);
      } else {
        setPhase('pause');
      }
    }
    return () => clearTimeout(timeout);
  }, [display, phase, wordIndex, words, typingSpeed, pauseMs]);

  return display;
}

function AnimatedStat({ value, label, active }) {
  const animated = useCountUp(value, 1600, active);
  const isNumber = !isNaN(parseInt(value, 10));
  return (
    <div className="home-hero-stat">
      <span className="home-hero-stat__value">{isNumber ? animated : value}</span>
      <span className="home-hero-stat__label">{label}</span>
    </div>
  );
}

/* ── Carte auteur avec hover 3D ── */
function AuthorCard3D({ author, enable3D = true }) {
  const cardRef = useRef(null);
  const rafRef = useRef(null);
  const hovering = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !enable3D) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const onEnter = () => {
      hovering.current = true;
      card.style.transition = 'transform 0.08s linear, box-shadow 0.6s ease-out, border-color 0.4s ease-out';
    };

    const onMove = (e) => {
      if (!hovering.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        card.style.transform = `rotateY(${nx * 9}deg) rotateX(${-ny * 9}deg) translateY(-6px) translateZ(8px)`;
        card.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    };

    const onLeave = () => {
      hovering.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      card.style.transition = 'transform 0.6s cubic-bezier(0.22,0.61,0.36,1), box-shadow 0.6s ease-out, border-color 0.4s ease-out';
      card.style.transform = '';
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    return () => {
      card.removeEventListener('mouseenter', onEnter);
      card.removeEventListener('mousemove', onMove);
      card.removeEventListener('mouseleave', onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enable3D]);

  const booksCount = author.books_count || 0;
  return (
    <Link
      ref={cardRef}
      to={`/authors/${author.id}`}
      className={`home-author-card ${enable3D ? 'home-author-card--3d' : ''}`}
    >
      <div className="home-author-card__inner">
        <div className="home-author-card__photo">
          {author.photo
            ? <img src={author.photo} alt={author.full_name} />
            : <span className="home-author-card__initial">{author.full_name?.charAt(0)}</span>}
        </div>
        <h3 className="home-author-card__name">{author.full_name}</h3>
        <span className="home-author-card__count">{booksCount} ouvrage{booksCount > 1 ? 's' : ''}</span>
        {author.biography && (
          <p className="home-author-card__bio">{author.biography.slice(0, 100)}{author.biography.length > 100 ? '...' : ''}</p>
        )}
      </div>
    </Link>
  );
}

const Home = () => {
  const typingWord = useTypingWords(HERO_TAGLINES);
  const [featured, setFeatured] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroReady, setHeroReady] = useState(false);
  const { ref: heroParallaxRef } = useParallax({ speed: 0.15 });
  // Explorer par genre
  const [activeGenre, setActiveGenre] = useState(0);
  const [genreBooksCache, setGenreBooksCache] = useState({});
  const [genreLoading, setGenreLoading] = useState(false);
  const genrePaused = useRef(false);

  // Sections reveal
  const { ref: featuredRef, isVisible: featuredVisible } = useReveal();
  const { ref: genresRef, isVisible: genresVisible } = useReveal();
  const { ref: bestRef, isVisible: bestVisible } = useReveal();
  const { ref: newRef, isVisible: newVisible } = useReveal();
  const { ref: authorsRef, isVisible: authorsVisible } = useReveal();
  const { ref: statsRef, isVisible: statsVisible } = useReveal({ threshold: 0.3 });

  useLayoutEffect(() => {
    setHeroReady(true);
  }, []);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [featRes, bestRes, newRes, authRes, catRes, statRes] = await Promise.allSettled([
        api.get('/books/featured/'),
        api.get('/books/bestsellers/'),
        api.get('/books/new-releases/'),
        api.get('/authors/with-books/'),
        api.get('/categories/with-books/'),
        api.get('/books/statistics/'),
      ]);
      if (featRes.status === 'fulfilled') setFeatured(featRes.value.data.results || featRes.value.data || []);
      if (bestRes.status === 'fulfilled') setBestsellers(bestRes.value.data.results || bestRes.value.data || []);
      if (newRes.status === 'fulfilled') setNewReleases(newRes.value.data.results || newRes.value.data || []);
      if (authRes.status === 'fulfilled') setAuthors(authRes.value.data.results || authRes.value.data || []);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.data.results || catRes.value.data || []);
      if (statRes.status === 'fulfilled') setStats(statRes.value.data);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  };

  // Charger les livres de la categorie active
  const loadGenreBooks = useCallback(async (catId) => {
    if (genreBooksCache[catId]) return;
    setGenreLoading(true);
    try {
      const res = await api.get(`/books/`, { params: { category: catId, page_size: 4 } });
      const books = res.data.results || res.data || [];
      setGenreBooksCache(prev => ({ ...prev, [catId]: books }));
    } catch { /* silencieux */ }
    finally { setGenreLoading(false); }
  }, [genreBooksCache]);

  // Charger les livres quand la categorie active change
  useEffect(() => {
    if (categories.length > 0) {
      loadGenreBooks(categories[activeGenre]?.id);
    }
  }, [activeGenre, categories, loadGenreBooks]);

  // Auto-rotation des genres (5s), pause au hover
  useEffect(() => {
    if (categories.length < 2) return;
    const id = setInterval(() => {
      if (!genrePaused.current) {
        setActiveGenre(prev => (prev + 1) % categories.length);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [categories.length]);

  const activeCategory = categories[activeGenre];
  const genreBooks = activeCategory ? (genreBooksCache[activeCategory.id] || []) : [];

  // Triptych : 3 premiers livres featured (ou bestsellers en fallback)
  const triptychBooks = (featured.length >= 3 ? featured : bestsellers).slice(0, 3);

  return (
    <div className="home-page">
      {/* ══════════ HERO ══════════ */}
      <section className="home-hero">
        <div ref={heroParallaxRef} className="tn-parallax">
          <div className="home-hero-orb home-hero-orb--1" />
          <div className="home-hero-orb home-hero-orb--2" />
          <div className="home-hero-grid-bg tn-motif-bg" />
        </div>

        <div className={`home-hero-inner ${heroReady ? 'is-ready' : ''}`}>
          <div className="home-hero-left">
            <h1 className="home-hero-title">
              <span className="home-hero-title__line">Demain s'écrit</span>{' '}
              <span className="home-hero-title__accent">{typingWord}<span className="home-hero-cursor" /></span>.
            </h1>

            <div className="home-hero-actions">
              <Link to="/catalog" className="tn-btn tn-btn--primary tn-btn--lg">
                <i className="fas fa-book-open" /> Explorer le catalogue
              </Link>
              <Link to="/submit-manuscript" className="tn-btn tn-btn--outline-light tn-btn--lg">
                <i className="fas fa-feather" /> Soumettre un manuscrit
              </Link>
            </div>

            <div className="home-hero-stats" ref={statsRef}>
              <AnimatedStat value={stats?.total_books || 0} label="titres au catalogue" active={statsVisible} />
              <AnimatedStat value={stats?.total_authors || 0} label="auteurs publiés" active={statsVisible} />
              <AnimatedStat value={stats?.total_categories || 0} label="catégories" active={statsVisible} />
            </div>
          </div>

          {/* Triptych flottant */}
          <div className="home-hero-right">
            {triptychBooks.length >= 3 ? (
              <div className="home-triptych">
                {[
                  { book: triptychBooks[1], cls: 'home-triptych__book--left home-triptych__float--slow' },
                  { book: triptychBooks[2], cls: 'home-triptych__book--right home-triptych__float--mid' },
                  { book: triptychBooks[0], cls: 'home-triptych__book--center home-triptych__float--fast' },
                ].map(({ book, cls }) => (
                  <div key={book.id} className={`home-triptych__book ${cls} home-triptych__float`}>
                    {book.cover_image ? (
                      <img src={book.cover_image} alt={book.title} className="home-triptych__img" loading="eager" />
                    ) : (
                      <TnBookCover book={book} />
                    )}
                  </div>
                ))}
                <div className="home-triptych__pick">
                  <i className="fas fa-star" /> Sélection du moment
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <SectionSeparator direction="dark-to-cream" variant={1} />

      {/* ══════════ SELECTION DE LA MAISON ══════════ */}
      {featured.length > 0 && (
        <section className={`home-books home-reveal ${featuredVisible ? 'is-visible' : ''}`} ref={featuredRef}>
          <div className="home-books-inner">
            <div className="home-section-header">
              <div>
                <span className="home-section-label">Sélection de la maison</span>
                <h2 className="home-section-title tn-section-title">
                  Nos <span className="home-section-title__accent">recommandations</span>
                </h2>
              </div>
              <Link to="/catalog" className="home-section-link">
                Voir tout <i className="fas fa-arrow-right" />
              </Link>
            </div>
            <p className="home-epigraph">« Chaque livre est un seuil. Voici quelques portes. »</p>
            <div className="home-books-grid">
              {featured.slice(0, 6).map((book, i) => (
                <div key={book.id} className="home-stagger-item" style={{ animationDelay: `${i * 80}ms` }}>
                  <BookCard book={book}  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ EXPLORER PAR GENRE ══════════ */}
      {categories.length > 0 && (
        <section
          className={`home-genres home-reveal ${genresVisible ? 'is-visible' : ''}`}
          ref={genresRef}
          onMouseEnter={() => { genrePaused.current = true; }}
          onMouseLeave={() => { genrePaused.current = false; }}
        >
          <div className="home-genres__inner">
            <div className="home-section-header">
              <div>
                <span className="home-section-label">Explorer par genre</span>
                <h2 className="home-section-title tn-section-title">
                  Parcourez nos <span className="home-section-title__accent">collections</span>
                </h2>
              </div>
            </div>
            <p className="home-epigraph">« Chaque collection est un territoire à arpenter. »</p>

            {/* Tabs */}
            <div className="home-genres__tabs">
              {categories.slice(0, 6).map((cat, i) => (
                <button
                  key={cat.id}
                  className={`home-genres__tab ${activeGenre === i ? 'home-genres__tab--active' : ''}`}
                  onClick={() => setActiveGenre(i)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Progress bar */}
            <div className="home-genres__progress">
              <div
                className="home-genres__progress-bar"
                style={{ width: `${((activeGenre + 1) / Math.min(categories.length, 6)) * 100}%` }}
              />
            </div>

            {/* Livres du genre actif */}
            <div className="home-genres__content" key={activeCategory?.id || 'empty'}>
              {genreLoading && genreBooks.length === 0 ? (
                <div className="home-genres__loading">
                  <div className="spinner" /> Chargement...
                </div>
              ) : genreBooks.length > 0 ? (
                <div className="home-books-grid home-genres__grid-animate">
                  {genreBooks.map((book, i) => (
                    <div key={book.id} className="home-stagger-item" style={{ animationDelay: `${i * 100}ms` }}>
                      <BookCard book={book} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="home-genres__empty">Aucun livre dans cette catégorie pour le moment.</p>
              )}
            </div>

            {/* CTA */}
            {activeCategory && (
              <div className="home-genres__cta">
                <Link to={`/catalog?category=${activeCategory.id}`} className="tn-btn tn-btn--outline">
                  Voir tous les livres {activeCategory.name} <i className="fas fa-arrow-right" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════ BESTSELLERS ══════════ */}
      {bestsellers.length > 0 && (
        <section className={`home-books home-reveal ${bestVisible ? 'is-visible' : ''}`} ref={bestRef}>
          <div className="home-books-inner">
            <div className="home-section-header">
              <div>
                <span className="home-section-label">Les plus populaires</span>
                <h2 className="home-section-title tn-section-title">
                  Best-sellers <span className="home-section-title__accent">du moment</span>
                </h2>
              </div>
              <Link to="/catalog?ordering=-rating" className="home-section-link">
                Voir tout <i className="fas fa-arrow-right" />
              </Link>
            </div>
            <p className="home-epigraph">« Les voix que d'autres ont déjà écoutées. »</p>
            <div className="home-books-grid">
              {bestsellers.slice(0, 4).map((book, i) => (
                <div key={book.id} className="home-stagger-item" style={{ animationDelay: `${i * 80}ms` }}>
                  <BookCard book={book}  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ NOUVEAUTES ══════════ */}
      {newReleases.length > 0 && (
        <section className={`home-books home-books--alt home-reveal ${newVisible ? 'is-visible' : ''}`} ref={newRef}>
          <div className="home-books-inner">
            <div className="home-section-header">
              <div>
                <span className="home-section-label">Fraîchement publiés</span>
                <h2 className="home-section-title tn-section-title">
                  Les <span className="home-section-title__accent">nouveautés</span>
                </h2>
              </div>
              <Link to="/catalog?ordering=-created_at" className="home-section-link">
                Voir tout <i className="fas fa-arrow-right" />
              </Link>
            </div>
            <p className="home-epigraph">« L'encre est fraîche, les histoires impatientes. »</p>
            <div className="home-books-grid">
              {newReleases.slice(0, 8).map((book, i) => (
                <div key={book.id} className="home-stagger-item" style={{ animationDelay: `${i * 80}ms` }}>
                  <BookCard book={book}  />
                </div>
              ))}
            </div>
            <div className="home-books-more">
              <Link to="/catalog" className="tn-btn tn-btn--dark tn-btn--lg">
                Explorer tout le catalogue <i className="fas fa-arrow-right" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <SectionSeparator direction="cream-to-cream" variant={2} />

      {/* ══════════ AUTEURS — carrousel infini ══════════ */}
      {authors.length > 0 && (
        <section className={`home-authors home-reveal ${authorsVisible ? 'is-visible' : ''}`} ref={authorsRef}>
          <div className="home-authors-inner">
            <div className="home-section-header">
              <div>
                <span className="home-section-label">Nos plumes</span>
                <h2 className="home-section-title tn-section-title">
                  Les <span className="home-section-title__accent">auteurs</span> Terre Noire
                </h2>
              </div>
              <Link to="/authors" className="home-section-link">
                Tous les auteurs <i className="fas fa-arrow-right" />
              </Link>
            </div>
            <p className="home-epigraph">« Derrière chaque œuvre, une voix qui demande à être entendue. »</p>

            {/* Carrousel horizontal infini */}
            <div className="home-authors-marquee">
              <div className="home-authors-marquee__track">
                {/* Double la liste pour boucle infinie */}
                {[...authors, ...authors].map((author, i) => (
                  <AuthorCard3D key={`${author.id}-${i}`} author={author} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* La transition vers le pied de page est ajoutée une seule fois par App.jsx */}
    </div>
  );
};

export default Home;
