import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import '../styles/BottomNav.css';

const BottomNav = () => {
  const location = useLocation();
  const { getTotalItems } = useCart();
  const { getWishlistCount } = useWishlist();
  const { isAuthenticated } = useAuth();

  // Don't show on admin pages or book reader
  if (location.pathname.startsWith('/admin') || location.pathname.includes('/read')) return null;

  const items = [
    { path: '/', icon: 'fas fa-house', label: 'Accueil' },
    { path: '/catalog', icon: 'fas fa-book-open', label: 'Catalogue' },
    { path: '/wishlist', icon: 'far fa-heart', label: 'Favoris', badge: getWishlistCount() },
    { path: '/cart', icon: 'fas fa-bag-shopping', label: 'Panier', badge: getTotalItems() },
    isAuthenticated
      ? { path: '/profile', icon: 'far fa-user', label: 'Compte', match: ['/profile', '/orders', '/settings'] }
      : { path: '/login', icon: 'far fa-user', label: 'Connexion', match: ['/login', '/register', '/forgot-password'] },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation mobile">
      {items.map((item) => {
        const active = item.path === '/'
          ? location.pathname === '/'
          : (item.match || [item.path]).some((p) => location.pathname.startsWith(p));
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav__item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
            aria-label={item.badge > 0 ? `${item.label} (${item.badge})` : undefined}
          >
            <span className="bottom-nav__icon">
              <i className={item.icon} aria-hidden="true" />
              {item.badge > 0 && <span className="bottom-nav__badge">{item.badge}</span>}
            </span>
            <span className="bottom-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
