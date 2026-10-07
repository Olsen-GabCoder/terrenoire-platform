import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';
import bookService from '../services/bookService';
import '../styles/Catalog.css';
import EmptyState from '../components/ui/EmptyState';

const ORDER_OPTIONS = [
  { value: '-created_at', label: 'Plus récents' },
  { value: 'created_at', label: 'Plus anciens' },
  { value: 'title', label: 'Titre A-Z' },
  { value: '-title', label: 'Titre Z-A' },
  { value: 'price', label: 'Prix croissant' },
  { value: '-price', label: 'Prix décroissant' },
];

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  // Loupe de l'en-tête mobile : on arrive ici avec le champ de recherche actif
  // (ref « callback » : le champ peut n'apparaître qu'après le premier chargement)
  const location = useLocation();
  const focusedForKey = useRef(null);
  const searchInputRef = useCallback((node) => {
    if (node && location.state?.focusSearch && focusedForKey.current !== location.key) {
      focusedForKey.current = location.key;
      node.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }, [location.key, location.state]);

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    author: searchParams.get('author') || '',
    has_ebook: searchParams.get('has_ebook') || '',
    available: searchParams.get('available') || '',
    ordering: searchParams.get('ordering') || '-created_at',
  });
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0, next: null, previous: null, currentPage: 1,
  });

  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden';
      const onEscape = (e) => { if (e.key === 'Escape') setMobileFiltersOpen(false); };
      document.addEventListener('keydown', onEscape);
      return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onEscape); };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileFiltersOpen]);

  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      author: searchParams.get('author') || '',
      has_ebook: searchParams.get('has_ebook') || '',
      available: searchParams.get('available') || '',
      ordering: searchParams.get('ordering') || '-created_at',
    });
  }, [searchParams]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await bookService.getCategories();
        setCategories(data.results || data);
      } catch (err) { console.error('Erreur catégories:', err); }
    };
    loadCategories();
  }, []);

  const loadBooks = useCallback(async (page = 1) => {
    try {
      setLoading(true); setError(null);
      const params = { page, page_size: 12, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const data = await bookService.getBooks(params);
      setBooks(data.results || data);
      setPagination({ count: data.count ?? (Array.isArray(data) ? data.length : 0), next: data.next, previous: data.previous, currentPage: page });
    } catch { setError("Le chargement des livres n'a pas abouti"); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadBooks(1); }, [loadBooks]);

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    const params = new URLSearchParams();
    Object.entries(updated).forEach(([k, v]) => { if (v) params.set(k, v); });
    navigate(`/catalog?${params.toString()}`);
  };

  const resetFilters = () => {
    setFilters({ search: '', category: '', author: '', has_ebook: '', available: '', ordering: '-created_at' });
    navigate('/catalog');
    setMobileFiltersOpen(false);
  };

  const handlePageChange = (page) => {
    loadBooks(page);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && k !== 'ordering').length;
  const totalPages = Math.ceil(pagination.count / 12);

  if (loading && books.length === 0) return (
    <div className="catalog-page">
      <section className="cat-hero"><div className="cat-hero__inner"><div className="cat-hero__left"><h1 className="cat-hero__title">Notre <span>catalogue</span></h1></div></div></section>
      <div style={{ padding: '0 56px', maxWidth: 1400, margin: '0 auto' }}>
        <div className="cat-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="cat-skel-card" style={{ '--i': i }}>
              <div className="cat-skel-cover" />
              <div className="cat-skel-line" />
              <div className="cat-skel-line cat-skel-line--short" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="catalog-page">
      {/* ── Mini hero ── */}
      <section className="cat-hero">
        <div className="tn-motif-bg cat-hero__motif" />
        <div className="cat-hero__inner">
          <div className="cat-hero__left">
            <div className="cat-hero__breadcrumb">
              <Link to="/">Accueil</Link> / Catalogue
            </div>
            <h1 className="cat-hero__title">
              Notre <span>catalogue</span>
            </h1>
            <p className="cat-hero__desc">
              {pagination.count > 0 && `${pagination.count} titre${pagination.count > 1 ? 's' : ''} réparti${pagination.count > 1 ? "s" : ""} sur ${categories.length || 4} collections. `}
              Filtrez par catégorie, format ou disponibilité.
            </p>
          </div>
          <div className="cat-hero__stats">
            <div className="cat-hero__stat">
              <span className="cat-hero__stat-value">{pagination.count || '—'}</span>
              <span className="cat-hero__stat-label">titres</span>
            </div>
            <span className="cat-hero__stat-sep" />
            <div className="cat-hero__stat">
              <span className="cat-hero__stat-value">{categories.length || '—'}</span>
              <span className="cat-hero__stat-label">collections</span>
            </div>
          </div>
        </div>

        {/* Search bar in hero */}
        <div className="cat-hero__search">
          <i className="fas fa-search" />
          <input
            placeholder="Rechercher un titre, un auteur, une référence..."
            ref={searchInputRef}
            type="search"
            enterKeyHint="search"
            aria-label="Rechercher dans le catalogue"
            value={searchInput}
            onChange={(e) => {
              const val = e.target.value;
              setSearchInput(val);
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
              searchDebounceRef.current = setTimeout(() => handleFilterChange('search', val), 400);
            }}
          />
          {searchInput && (
            <button type="button" onClick={() => { setSearchInput(''); handleFilterChange('search', ''); }} aria-label="Effacer">
              <i className="fas fa-times" />
            </button>
          )}
        </div>
      </section>

      <div className="tn-motif-strip" style={{ opacity: 0.6 }} />

      {/* ── Filters + Grid ── */}
      <section className="cat-content" ref={gridRef}>
        {/* Filters card */}
        <div className={`cat-filters ${mobileFiltersOpen ? 'cat-filters--drawer-open' : ''}`}>
          <div className="cat-filters__head">
            <div className="cat-filters__head-label">
              <span>Filtres</span>
              {activeFilterCount > 0 && (
                <button type="button" className="cat-filters__reset-link" onClick={resetFilters}>
                  <i className="fas fa-rotate-left" /> Réinitialiser
                </button>
              )}
            </div>
            <button type="button" className="cat-filters__mobile-btn" onClick={() => setMobileFiltersOpen(true)}>
              <i className="fas fa-sliders-h" />
              <span>Filtres</span>
              {activeFilterCount > 0 && <span className="cat-filters__mobile-btn-badge">{activeFilterCount}</span>}
            </button>
          </div>

          <div className="cat-filters__backdrop" role="button" tabIndex={0} aria-label="Fermer les filtres" onClick={() => setMobileFiltersOpen(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMobileFiltersOpen(false); } }} />

          <div className="cat-filters__drawer">
            <div className="cat-filters__drawer-header">
              <h3>Filtres</h3>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Fermer">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cat-filters__drawer-body">
              {/* Categories */}
              <div className="cat-filters__group">
                <span className="cat-filters__label">Catégorie</span>
                <div className="cat-filters__pills">
                  <button type="button" className={`cat-filters__pill ${!filters.category ? 'cat-filters__pill--active' : ''}`} onClick={() => handleFilterChange('category', '')}>Toutes</button>
                  {categories.map((c) => (
                    <button key={c.id} type="button" className={`cat-filters__pill ${filters.category === String(c.id) ? 'cat-filters__pill--active' : ''}`}
                      onClick={() => handleFilterChange('category', filters.category === String(c.id) ? '' : c.id)}>{c.name}</button>
                  ))}
                </div>
              </div>

              {/* Format + Availability + Sort */}
              <div className="cat-filters__row">
                <div className="cat-filters__group">
                  <span className="cat-filters__label">Format</span>
                  <div className="cat-filters__toggles">
                    <button type="button" className={`cat-filters__toggle ${!filters.has_ebook ? 'cat-filters__toggle--active' : ''}`} onClick={() => handleFilterChange('has_ebook', '')}>Tous</button>
                    <button type="button" className={`cat-filters__toggle ${filters.has_ebook === 'true' ? 'cat-filters__toggle--active' : ''}`} onClick={() => handleFilterChange('has_ebook', filters.has_ebook === 'true' ? '' : 'true')}><i className="fas fa-file-pdf" /> Avec ebook</button>
                  </div>
                </div>
                <div className="cat-filters__group">
                  <span className="cat-filters__label">Disponibilité</span>
                  <div className="cat-filters__toggles">
                    <button type="button" className={`cat-filters__toggle ${!filters.available ? 'cat-filters__toggle--active' : ''}`} onClick={() => handleFilterChange('available', '')}>Tous</button>
                    <button type="button" className={`cat-filters__toggle ${filters.available === 'true' ? 'cat-filters__toggle--active' : ''}`} onClick={() => handleFilterChange('available', filters.available === 'true' ? '' : 'true')}><i className="fas fa-check" /> En stock</button>
                  </div>
                </div>
                <div className="cat-filters__group cat-filters__group--sort">
                  <span className="cat-filters__label">Trier par</span>
                  <div className="cat-filters__select-wrap">
                    <select value={filters.ordering} onChange={(e) => handleFilterChange('ordering', e.target.value)} className="cat-filters__select">
                      {ORDER_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                    <i className="fas fa-chevron-down cat-filters__select-arrow" />
                  </div>
                </div>
              </div>

              {/* Active chips */}
              {activeFilterCount > 0 && (
                <div className="cat-filters__active">
                  <span className="cat-filters__active-label">Actifs</span>
                  {filters.search && (
                    <span className="cat-filters__chip">« {filters.search} » <button type="button" onClick={() => handleFilterChange('search', '')}><i className="fas fa-times" /></button></span>
                  )}
                  {filters.category && (
                    <span className="cat-filters__chip">{categories.find((c) => c.id === parseInt(filters.category))?.name || 'Catégorie'} <button type="button" onClick={() => handleFilterChange('category', '')}><i className="fas fa-times" /></button></span>
                  )}
                  {filters.has_ebook && (
                    <span className="cat-filters__chip">Avec ebook <button type="button" onClick={() => handleFilterChange('has_ebook', '')}><i className="fas fa-times" /></button></span>
                  )}
                  {filters.available && (
                    <span className="cat-filters__chip">{filters.available === 'true' ? 'En stock' : 'Épuisé'} <button type="button" onClick={() => handleFilterChange('available', '')}><i className="fas fa-times" /></button></span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Result summary */}
        <div className="cat-summary">
          {pagination.count > 0 ? (
            <span><strong>{pagination.count} titre{pagination.count > 1 ? 's' : ''}</strong> trouvé{pagination.count > 1 ? 's' : ''} · page {pagination.currentPage} sur {totalPages || 1}</span>
          ) : (
            <span><strong>Aucun titre</strong> trouvé</span>
          )}
        </div>

        {/* Grid */}
        <main className="cat-main">
          {error ? (
            <EmptyState icon="fa-triangle-exclamation" tone="error" title={error}>
              <button type="button" className="tn-btn tn-btn--primary tn-btn--lg" onClick={() => loadBooks(1)}><i className="fas fa-rotate-right" /> Réessayer</button>
            </EmptyState>
          ) : books.length > 0 ? (
            <>
              <div className={`cat-grid${loading ? ' cat-grid--loading' : ''}`}>
                {books.map((book, index) => (<div key={book.id} style={{ '--i': index }}><BookCard book={book} /></div>))}
              </div>
              {totalPages > 1 && (
                <nav className="cat-pag" aria-label="Pagination">
                  <button type="button" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.previous} className="cat-pag__btn">
                    <i className="fas fa-chevron-left" /> <span>Précédent</span>
                  </button>
                  <div className="cat-pag__pages">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => { const c = pagination.currentPage; return p === 1 || p === totalPages || (p >= c - 1 && p <= c + 1); })
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="cat-pag__dots">&hellip;</span>}
                          <button type="button" className={`cat-pag__page ${p === pagination.currentPage ? 'is-active' : ''}`} onClick={() => handlePageChange(p)}>{p}</button>
                        </React.Fragment>
                      ))}
                  </div>
                  <button type="button" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.next} className="cat-pag__btn">
                    <span>Suivant</span> <i className="fas fa-chevron-right" />
                  </button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              icon="fa-book-open"
              title="Aucun ouvrage ne répond à cet appel"
              text="Affinons votre quête : modifiez vos filtres ou votre recherche pour découvrir d'autres horizons littéraires."
            >
              <button type="button" className="tn-btn tn-btn--primary tn-btn--lg" onClick={resetFilters}><i className="fas fa-rotate-left" /> Réinitialiser les filtres</button>
            </EmptyState>
          )}
        </main>
      </section>
    </div>
  );
};

export default Catalog;
