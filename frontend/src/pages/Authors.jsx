import { useState, useEffect, useMemo } from 'react';
import bookService from '../services/bookService';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthorCard, { AuthorCardSkeleton } from '../components/AuthorCard';
import '../styles/Authors.css';
import PageHero from '../components/ui/PageHero';
import EmptyState from '../components/ui/EmptyState';

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
      <PageHero eyebrow="Nos plumes" icon="fa-feather-pointed" title="Nos" accent="auteurs" />
      <div className="auth-content"><div className="auth-grid" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => <AuthorCardSkeleton key={i} />)}
      </div></div>
    </div>
  );

  if (error) {
    return (
      <div className="auth-page">
        <EmptyState icon="fa-triangle-exclamation" tone="error" title={error}>
          <button type="button" className="tn-btn tn-btn--primary tn-btn--lg" onClick={loadAuthors}><i className="fas fa-rotate-right" /> Réessayer</button>
        </EmptyState>
            </div>
    );
  }

  return (
    <div className="auth-page">
      {/* ── HERO ── */}
      <PageHero
        eyebrow={stats.authors > 0 ? `${stats.authors} auteur${stats.authors > 1 ? 's' : ''} · ${stats.books}+ ouvrages` : 'Nos plumes'}
        icon="fa-feather-pointed"
        title="Nos"
        accent="auteurs"
        subtitle="Découvrez les voix singulières qui composent notre catalogue — chaque plume, une vision du monde."
      />

      {/* ── CONTENU ── */}
      <div className="authors-content">
        <div className="auth-wrap">

          {/* Barre recherche + tri */}
          <div className="auth-bar">
            <label className="auth-bar__search">
              <i className="fas fa-search auth-bar__search-ico" aria-hidden="true" />
              <input
                type="search"
                placeholder="Rechercher un auteur…"
                aria-label="Rechercher un auteur"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="auth-bar__search-x" aria-label="Effacer la recherche">
                  <i className="fas fa-times" />
                </button>
              )}
            </label>
            <div className="auth-bar__sort">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Trier les auteurs">
                <option value="name">Nom A-Z</option>
                <option value="books">Livres publiés</option>
              </select>
              <i className="fas fa-chevron-down auth-bar__sort-arrow" aria-hidden="true" />
            </div>
          </div>

          {/* Grille */}
          {filtered.length === 0 ? (
            <EmptyState icon="fa-feather-pointed" title="Aucun auteur trouvé" text="Essayez un autre nom ou une autre orthographe.">
              <button type="button" className="tn-btn tn-btn--primary tn-btn--lg" onClick={() => setSearch('')}>
                <i className="fas fa-rotate-left" /> Voir tous les auteurs
              </button>
            </EmptyState>
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
