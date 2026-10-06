import { useState, useEffect, useMemo } from 'react';
import bookService from '../services/bookService';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthorCard, { AuthorCardSkeleton } from '../components/AuthorCard';
import '../styles/Authors.css';

const Authors = () => {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => { loadAuthors(); }, []);

  const loadAuthors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookService.getAuthors();
      setAuthors(Array.isArray(data) ? data : data.results || []);
    } catch {
      setError("Nous n'avons pas pu charger les auteurs.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...authors];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.full_name?.toLowerCase().includes(q) || a.biography?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) =>
      sortBy === 'books'
        ? (b.books_count || 0) - (a.books_count || 0)
        : (a.full_name || '').localeCompare(b.full_name || '')
    );
    return list;
  }, [authors, search, sortBy]);

  const stats = useMemo(() => ({
    authors: authors.length,
    books: authors.reduce((s, a) => s + (a.books_count || 0), 0),
  }), [authors]);

  if (loading) return (
    <div className="auth-page">
      <section className="auth-hero"><div className="auth-hero__inner"><h1 className="auth-hero__title">Nos <span>auteurs</span></h1></div></section>
      <div className="auth-hero-fade" />
      <div className="auth-content"><div className="auth-grid" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => <AuthorCardSkeleton key={i} />)}
      </div></div>
    </div>
  );

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-state">
          <div className="auth-state__ico auth-state__ico--err"><i className="fas fa-exclamation-triangle" /></div>
          <h3>{error}</h3>
          <button type="button" className="auth-state__btn" onClick={loadAuthors}><i className="fas fa-redo" /> Réessayer</button>
            </div>
            </div>
    );
  }

  return (
    <div className="auth-page">
      {/* ── HERO ── */}
      <section className="auth-hero">
        <div className="auth-hero__orb auth-hero__orb--1" />
        <div className="auth-hero__orb auth-hero__orb--2" />
        <div className="auth-hero__grid-bg" />
        <div className="auth-hero__inner">
          <div className="auth-hero__line" />
          <h1 className="auth-hero__title">Nos auteurs</h1>
          <p className="auth-hero__sub">
            Découvrez les voix singulières qui composent notre catalogue — chaque plume, une vision du monde.
          </p>
          <div className="auth-hero__stats">
            {[
              { val: stats.authors, lbl: 'Auteurs' },
              { val: `${stats.books}+`, lbl: 'Ouvrages' },
            ].map((s) => (
              <div className="auth-hero__stat" key={s.lbl}>
                <span className="auth-hero__stat-val">{s.val}</span>
                <span className="auth-hero__stat-lbl">{s.lbl}</span>
          </div>
            ))}
              </div>
          {stats.authors > 0 && (
            <p className="auth-hero__count">
              <strong>{stats.authors}</strong> auteur{stats.authors > 1 ? 's' : ''} à découvrir
            </p>
          )}
          </div>
        </section>

      <div className="auth-hero-fade" />

      {/* ── CONTENU ── */}
      <div className="authors-content">
        <div className="auth-wrap">

          {/* Barre filtres */}
          <div className="cat-bar">
            <div className="cat-bar__row">
              <div className="cat-bar__search">
                <i className="fas fa-search cat-bar__search-ico" />
                    <input
                      type="text"
                  placeholder="Rechercher un auteur…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="cat-bar__search-x" aria-label="Effacer">
                    <i className="fas fa-times" />
                      </button>
                    )}
                  </div>
              <div className="cat-bar__capsules">
                <div className="cat-cap cat-cap--sort">
                  <i className="fas fa-arrow-up-wide-short cat-cap__ico" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="name">Nom A-Z</option>
                    <option value="books">Livres publiés</option>
                      </select>
                      </div>
                      </div>
                    </div>
                  </div>
                  
          {/* Grille */}
          {filtered.length === 0 ? (
            <div className="auth-state">
              <div className="auth-state__ico"><i className="fas fa-user-slash" /></div>
              <h3>Aucun auteur trouvé</h3>
              <p>Essayez un autre terme de recherche.</p>
              <button type="button" className="auth-state__btn" onClick={() => setSearch('')}>
                <i className="fas fa-redo" /> Voir tous les auteurs
                </button>
              </div>
            ) : (
            <div className="auth-grid">
              {filtered.map((author) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </div>
            )}
          </div>
            </div>
            
                      </div>
  );
};

export default Authors;
