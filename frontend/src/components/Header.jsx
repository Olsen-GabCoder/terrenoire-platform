import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { configAPI } from '../services/api';
import TnTooltip from './ui/TnTooltip';
import '../styles/Header.css';

const LOGO_SRC = '/images/logo_terre_noire.png';

const Header = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { getTotalItems } = useCart();
  const { getWishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const mobileMenuRef = useRef(null);
  const burgerButtonRef = useRef(null);
  const searchRef = useRef(null);
  const userDropdownRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Recherche globale debounced (300ms)
  const performSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await configAPI.globalSearch(q.trim());
      setSearchResults(res.data);
    } catch {
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (searchQuery.trim().length >= 2) {
      debounceRef.current = setTimeout(() => performSearch(searchQuery), 300);
    } else {
      setSearchResults(null);
    }
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, performSearch]);

  // Fermer le dropdown de recherche en cliquant dehors
  useEffect(() => {
    const handleClick = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)
          && searchRef.current && !searchRef.current.closest('.tn-header__search')?.contains(e.target)) {
        setSearchResults(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchResults(null);
      setMobileMenuOpen(false);
      searchRef.current?.blur();
    }
  };

  const handleResultClick = () => {
    setSearchQuery('');
    setSearchResults(null);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const toggleUserDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setUserDropdownOpen(!userDropdownOpen);
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const closeAllMenus = () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') closeAllMenus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen &&
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target) &&
        !event.target.closest('.tn-header__user-trigger')) {
        setUserDropdownOpen(false);
      }
      if (mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        burgerButtonRef.current &&
        !burgerButtonRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen, mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navItems = [
    { path: '/', label: 'Accueil', icon: 'fas fa-house' },
    { path: '/catalog', label: 'Catalogue', icon: 'fas fa-book-open-reader' },
    { path: '/authors', label: 'Auteurs', icon: 'fas fa-feather' },
    { path: '/about', label: 'À propos', icon: 'fas fa-circle-info' },
    { path: '/contact', label: 'Contact', icon: 'fas fa-envelope' },
  ];

  const userInitial = (user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U').toUpperCase();

  // ── Mobile drawer (JSX inline, pas un composant, pour eviter unmount/remount a chaque keystroke) ──
  const mobileDrawer = (
    <div
      ref={mobileMenuRef}
      className="tn-drawer-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) setMobileMenuOpen(false); }}
    >
      <div className="tn-drawer">
        {/* Drawer header */}
        <div className="tn-drawer__header">
          <div className="tn-drawer__brand">
            <img src={LOGO_SRC} alt="Terre Noire" className="tn-drawer__logo" />
            <div className="tn-drawer__brand-text">
              <span className="tn-drawer__brand-name">T. NOIRE</span>
            </div>
          </div>
          <button className="tn-drawer__close" onClick={() => setMobileMenuOpen(false)} aria-label="Fermer le menu">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="tn-drawer__content">
          {/* User card or auth buttons */}
          {isAuthenticated ? (
            <div className="tn-drawer__user-card">
              <div className="tn-header__avatar">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="" className="tn-header__avatar-img" />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <div>
                <div className="tn-drawer__user-name">{user?.first_name || user?.username || 'Utilisateur'}</div>
                <div className="tn-drawer__user-email">{user?.email || ''}</div>
              </div>
            </div>
          ) : (
            <div className="tn-drawer__auth-bar">
              <Link to="/login" className="tn-drawer__auth-btn" onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-sign-in-alt" /> Connexion
              </Link>
              <Link to="/register" className="tn-drawer__auth-btn tn-drawer__auth-btn--primary" onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-user-plus" /> Inscription
              </Link>
            </div>
          )}

          {/* Search */}
          <form onSubmit={handleSearch} className="tn-drawer__search">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="Rechercher un livre, auteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Nav */}
          <nav className="tn-drawer__nav">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`tn-drawer__nav-link ${active ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="tn-drawer__separator" />

          {/* Panier & Favoris */}
          <div className="tn-drawer__separator" />
          <Link to="/wishlist" className="tn-drawer__nav-link" onClick={() => setMobileMenuOpen(false)}>
            <i className="fas fa-heart" />
            <span>Mes favoris</span>
            {getWishlistCount() > 0 && <span className="tn-drawer__badge">{getWishlistCount()}</span>}
          </Link>
          <Link to="/cart" className="tn-drawer__nav-link" onClick={() => setMobileMenuOpen(false)}>
            <i className="fas fa-shopping-bag" />
            <span>Mon panier</span>
            {getTotalItems() > 0 && <span className="tn-drawer__badge">{getTotalItems()}</span>}
          </Link>

          <div className="tn-drawer__separator" />

          {/* Soumettre un manuscrit */}
          <Link to="/submit-manuscript" className="tn-drawer__submit-link" onClick={() => setMobileMenuOpen(false)}>
            <i className="fas fa-pen-to-square" /> Soumettre un manuscrit
          </Link>

          {/* Account links */}
          {isAuthenticated && (
            <>
              <div className="tn-drawer__separator" />

              {isAdmin && (
                <Link to="/admin-dashboard" className="tn-drawer__nav-link tn-drawer__nav-link--admin" onClick={() => setMobileMenuOpen(false)}>
                  <i className="fas fa-gauge-high" />
                  <span>Administration</span>
                  <i className="fas fa-arrow-right tn-drawer__chevron" />
                </Link>
              )}

              <Link to="/profile" className="tn-drawer__nav-link" onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-user" />
                <span>Mon profil</span>
              </Link>
              <Link to="/orders" className="tn-drawer__nav-link" onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-box" />
                <span>Mes commandes</span>
              </Link>

              <div className="tn-drawer__separator" />

              <button onClick={handleLogout} className="tn-drawer__nav-link tn-drawer__nav-link--logout">
                <i className="fas fa-sign-out-alt" />
                <span>Déconnexion</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <nav className={`tn-header ${scrolled ? 'tn-header--scrolled' : ''}`}>
        <div className="tn-header__bar">
          {/* Brand */}
          <TnTooltip text="Maison d'edition litteraire africaine" position="bottom" align="start" delay={400}>
            <Link to="/" className="tn-header__brand" onClick={closeAllMenus} aria-label="Accueil">
              <img src={LOGO_SRC} alt="Terre Noire" className="tn-header__logo" />
              <div className="tn-header__brand-text">
                <span className="tn-header__brand-name">TERRE NOIRE</span>
                <span className="tn-header__brand-sub">Editions</span>
              </div>
            </Link>
          </TnTooltip>

          {/* Desktop nav */}
          <nav className="tn-header__nav">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`tn-header__nav-link ${active ? 'active' : ''}`}
                  onClick={closeAllMenus}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Search */}
          <div className="tn-header__search-wrapper">
            <form onSubmit={handleSearch} className="tn-header__search">
              <i className="fas fa-search tn-header__search-icon" />
              <input
                ref={searchRef}
                type="text"
                className="tn-header__search-input"
                placeholder="Rechercher un titre, un auteur, une catégorie…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                aria-label="Rechercher"
                autoComplete="off"
              />
              {searchLoading && (
                <i className="fas fa-spinner fa-spin tn-header__search-spinner" />
              )}
              {searchQuery && !searchLoading && (
                <button type="button" className="tn-header__search-clear" onClick={() => { setSearchQuery(''); setSearchResults(null); }} aria-label="Effacer">
                  <i className="fas fa-times" />
                </button>
              )}
              {!searchFocused && !searchQuery && (
                <span className="tn-header__search-shortcut">⌘ K</span>
              )}
            </form>

            {/* Dropdown resultats */}
            {searchResults && searchResults.total > 0 && (
              <div className="tn-search-dropdown" ref={searchDropdownRef}>
                {searchResults.books.length > 0 && (
                  <div className="tn-search-dropdown__group">
                    <div className="tn-search-dropdown__group-label">
                      <i className="fas fa-book" /> Livres
                    </div>
                    {searchResults.books.map(book => (
                      <Link key={`b-${book.id}`} to={`/books/${book.id}`} className="tn-search-dropdown__item" onClick={handleResultClick}>
                        <div className="tn-search-dropdown__item-img">
                          {book.cover_image
                            ? <img src={book.cover_image} alt="" />
                            : <i className="fas fa-book" />}
                        </div>
                        <div className="tn-search-dropdown__item-info">
                          <div className="tn-search-dropdown__item-title">{book.title}</div>
                          <div className="tn-search-dropdown__item-meta">
                            {book.author_name && <span>{book.author_name}</span>}
                            {book.category_name && <span> · {book.category_name}</span>}
                          </div>
                        </div>
                        <div className="tn-search-dropdown__item-price">
                          {Number(book.price).toLocaleString('fr-FR')} F
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.authors.length > 0 && (
                  <div className="tn-search-dropdown__group">
                    <div className="tn-search-dropdown__group-label">
                      <i className="fas fa-feather" /> Auteurs
                    </div>
                    {searchResults.authors.map(author => (
                      <Link key={`a-${author.id}`} to={`/authors/${author.id}`} className="tn-search-dropdown__item" onClick={handleResultClick}>
                        <div className="tn-search-dropdown__item-img tn-search-dropdown__item-img--round">
                          {author.photo
                            ? <img src={author.photo} alt="" />
                            : <i className="fas fa-user" />}
                        </div>
                        <div className="tn-search-dropdown__item-info">
                          <div className="tn-search-dropdown__item-title">{author.full_name}</div>
                          <div className="tn-search-dropdown__item-meta">
                            {author.books_count} livre{author.books_count > 1 ? 's' : ''}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.categories.length > 0 && (
                  <div className="tn-search-dropdown__group">
                    <div className="tn-search-dropdown__group-label">
                      <i className="fas fa-tag" /> Catégories
                    </div>
                    {searchResults.categories.map(cat => (
                      <Link key={`c-${cat.id}`} to={`/catalog?category=${cat.id}`} className="tn-search-dropdown__item" onClick={handleResultClick}>
                        <div className="tn-search-dropdown__item-img">
                          <i className="fas fa-tag" />
                        </div>
                        <div className="tn-search-dropdown__item-info">
                          <div className="tn-search-dropdown__item-title">{cat.name}</div>
                          <div className="tn-search-dropdown__item-meta">
                            {cat.books_count} livre{cat.books_count > 1 ? 's' : ''} disponible{cat.books_count > 1 ? 's' : ''}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <Link to={`/catalog?search=${encodeURIComponent(searchQuery)}`} className="tn-search-dropdown__all" onClick={handleResultClick}>
                  Voir tous les résultats pour « {searchQuery} » <i className="fas fa-arrow-right" />
                </Link>
              </div>
            )}

            {searchResults && searchResults.total === 0 && searchQuery.length >= 2 && (
              <div className="tn-search-dropdown" ref={searchDropdownRef}>
                <div className="tn-search-dropdown__empty">
                  <i className="fas fa-search" />
                  <span>Aucun résultat pour « {searchQuery} »</span>
                </div>
              </div>
            )}
          </div>

          {/* Right cluster */}
          <div className="tn-header__actions">
            <Link to="/wishlist" className="tn-header__icon-btn" onClick={closeAllMenus} aria-label="Liste d'envie">
              <i className="far fa-heart" />
              {getWishlistCount() > 0 && <span className="tn-header__badge tn-header__badge--gold">{getWishlistCount()}</span>}
            </Link>
            <Link to="/cart" className="tn-header__icon-btn" onClick={closeAllMenus} aria-label="Panier">
              <i className="fas fa-shopping-bag" />
              {getTotalItems() > 0 && <span className="tn-header__badge">{getTotalItems()}</span>}
            </Link>

            {isAuthenticated ? (
              <div className="tn-header__user-container" ref={userDropdownRef}>
                <button className="tn-header__user-trigger" onClick={toggleUserDropdown} aria-expanded={userDropdownOpen} aria-label="Menu compte">
                  <div className="tn-header__avatar">
                    {user?.profile_image ? (
                      <img src={user.profile_image} alt="" className="tn-header__avatar-img" />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                  <span className="tn-header__user-name">{user?.first_name || 'Compte'}</span>
                  <i className={`fas fa-chevron-${userDropdownOpen ? 'up' : 'down'} tn-header__user-chevron`} />
                </button>

                {userDropdownOpen && (
                  <div className="tn-dropdown">
                    <div className="tn-dropdown__header">
                      <div className="tn-header__avatar tn-header__avatar--lg">
                        {user?.profile_image ? (
                          <img src={user.profile_image} alt="" className="tn-header__avatar-img" />
                        ) : (
                          <span>{userInitial}</span>
                        )}
                      </div>
                      <div className="tn-dropdown__header-info">
                        <strong>{user?.first_name || user?.username || 'Utilisateur'}</strong>
                        <small>{user?.email || ''}</small>
                      </div>
                    </div>

                    <div className="tn-dropdown__body">
                      {isAdmin && (
                        <Link to="/admin-dashboard" className="tn-dropdown__item tn-dropdown__item--admin" onClick={closeAllMenus}>
                          <i className="fas fa-gauge-high" />
                          <span>Administration</span>
                          <i className="fas fa-arrow-right tn-dropdown__arrow" />
                        </Link>
                      )}

                      <Link to="/profile" className="tn-dropdown__item" onClick={closeAllMenus}>
                        <i className="fas fa-user" />
                        <span>Mon profil</span>
                      </Link>
                      <Link to="/orders" className="tn-dropdown__item" onClick={closeAllMenus}>
                        <i className="fas fa-box" />
                        <span>Mes commandes</span>
                      </Link>
                      <Link to="/wishlist" className="tn-dropdown__item" onClick={closeAllMenus}>
                        <i className="fas fa-heart" />
                        <span>Mes favoris</span>
                      </Link>
                    </div>

                    <div className="tn-dropdown__footer">
                      <button onClick={handleLogout} className="tn-dropdown__logout-btn">
                        <i className="fas fa-sign-out-alt" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="tn-header__auth">
                <Link to="/login" className="tn-header__login" onClick={closeAllMenus}>Connexion</Link>
                <Link to="/register" className="tn-btn tn-btn--primary tn-btn--sm" onClick={closeAllMenus}>Inscription</Link>
              </div>
            )}
          </div>

          {/* Mobile right cluster — burger only, everything else in drawer */}
          <div className="tn-header__mobile-actions">
            <button
              ref={burgerButtonRef}
              className="tn-header__burger"
              onClick={toggleMobileMenu}
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`} />
              {getTotalItems() > 0 && <span className="tn-header__burger-badge">{getTotalItems()}</span>}
            </button>
          </div>
        </div>

        {/* Sub-strip: delivery info (default state only) */}
        {!scrolled && (
          <div className="tn-header__sub-strip">
            <div className="tn-header__sub-strip-left">
              <span><i className="fas fa-truck" /> Livraison gratuite à Port-Gentil dès 25 000 FCFA</span>
              <span className="tn-header__sub-strip-dot">·</span>
              <span>Paiement Moov Money &amp; Airtel Money</span>
            </div>
            <span className="tn-header__sub-strip-phone">☎ +241 65 34 88 87</span>
          </div>
        )}

        {/* Motif strip on scrolled */}
        {scrolled && <div className="tn-motif-strip" style={{ opacity: 0.6 }} />}
      </nav>

      {mobileMenuOpen && createPortal(mobileDrawer, document.body)}
    </>
  );
};

export default Header;
