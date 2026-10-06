import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import '../styles/Profile.css';

const Profile = () => {
  const { user, authChecked, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    city: '',
    country: '',
    receive_newsletter: false,
  });
  
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        receive_newsletter: user.receive_newsletter || false,
      });
    }
  }, [user]);

  // Charger les commandes au montage (pour stats) et quand on ouvre l'onglet
  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  useEffect(() => {
    requestAnimationFrame(() => setHeroReady(true));
  }, []);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await orderService.getOrders();
      setOrders(response.results || response);
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  // (attendre la fin de la vérification de session, sinon un F5 déconnecte l'utilisateur)
  useEffect(() => {
    if (authChecked && !user) {
      navigate('/login', { state: { from: '/profile' } });
    }
  }, [authChecked, user, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image trop volumineuse (max 2 Mo)' });
      return;
    }
    setAvatarLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const formData = new FormData();
      formData.append('profile_image', file);
      const result = await updateProfile(formData);
      if (result.success) {
        setMessage({ type: 'success', text: 'Photo mise à jour !' });
      } else {
        const errMsg = typeof result.error === 'string' ? result.error : 'Erreur lors de l\'upload';
        setMessage({ type: 'error', text: errMsg });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de l\'upload' });
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        receive_newsletter: formData.receive_newsletter,
      };

      const result = await updateProfile(updateData);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
        setIsEditing(false);
      } else {
        const errMsg = typeof result.error === 'string' ? result.error : 'Erreur lors de la mise à jour';
        setMessage({ type: 'error', text: errMsg });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Une erreur est survenue' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + ' FCFA';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { label: 'En attente', color: '#f59e0b' },
      PAID: { label: 'Payé', color: '#10b981' },
      SHIPPED: { label: 'Expédié', color: '#3b82f6' },
      CANCELLED: { label: 'Annulé', color: '#ef4444' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className="status-badge" style={{ backgroundColor: config.color }}>
        {config.label}
      </span>
    );
  };

  const totalSpent = useMemo(() => {
    return orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  }, [orders]);

  const memberSince = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Utilisateur';
  const initials = (user?.first_name?.charAt(0) || '') + (user?.last_name?.charAt(0) || '') || (user?.username?.charAt(0) || 'U');

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-hero-orb profile-hero-orb--1" />
        <div className="profile-hero-orb profile-hero-orb--2" />
        <div className="profile-hero-grid-bg" />
        <div className={`profile-hero-inner ${heroReady ? 'is-ready' : ''}`}>
          <div className="profile-hero-photo-wrap">
            <div className="profile-hero-avatar-wrap">
              <label className={`profile-hero-avatar profile-hero-avatar--editable ${avatarLoading ? 'is-loading' : ''}`} htmlFor="profile-avatar-input">
                {user.profile_image ? (
                  <img src={user.profile_image} alt="" className="profile-hero-avatar-img" />
                ) : (
                  <span className="profile-hero-avatar-initials">{initials.toUpperCase()}</span>
                )}
                {avatarLoading ? (
                  <span className="profile-hero-avatar-overlay">
                    <i className="fas fa-spinner fa-spin" />
                  </span>
                ) : (
                  <span className="profile-hero-avatar-overlay">
                    <i className="fas fa-camera" /> Changer
                  </span>
                )}
              </label>
              <input
                id="profile-avatar-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="profile-hero-avatar-input"
                onChange={handleAvatarChange}
                disabled={avatarLoading}
              />
              <span className="profile-hero-status-dot" title="Connecté" aria-hidden="true" />
            </div>
          </div>
          <div className="profile-hero-line" />
          <h1 className="profile-hero-title">{displayName}</h1>
          <p className="profile-hero-email">{user.email}</p>
          {memberSince && (
            <p className="profile-hero-since">Membre depuis {memberSince}</p>
          )}
        </div>
        <div className="profile-hero-fade" />
      </section>

      <section className="profile-content-section">
        <div className="profile-content-inner">
          <div className="profile-sidebar">
          {/* Stats */}
          <div className="profile-stats">
            <div className="profile-stat-card">
              <div className="profile-stat-icon profile-stat-icon--orders">
                <i className="fas fa-shopping-bag" />
              </div>
              <div className="profile-stat-body">
                <span className="profile-stat-value">{orders.length}</span>
                <span className="profile-stat-label">Commandes</span>
              </div>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-icon profile-stat-icon--revenue">
                <i className="fas fa-coins" />
              </div>
              <div className="profile-stat-body">
                <span className="profile-stat-value">{formatPrice(totalSpent)}</span>
                <span className="profile-stat-label">Total dépensé</span>
              </div>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-icon profile-stat-icon--calendar">
                <i className="fas fa-calendar-check" />
              </div>
              <div className="profile-stat-body">
                <span className="profile-stat-value">{memberSince || '—'}</span>
                <span className="profile-stat-label">Membre depuis</span>
              </div>
            </div>
          </div>

          {/* Raccourcis */}
          <div className="profile-quick-links">
            <h3 className="profile-section-heading">Accès rapides</h3>
            <div className="profile-quick-links-grid">
              <Link to="/catalog" className="profile-quick-link">
                <i className="fas fa-book-open" />
                <span>Catalogue</span>
              </Link>
              <Link to="/submit-manuscript" className="profile-quick-link">
                <i className="fas fa-pen-nib" />
                <span>Soumettre un manuscrit</span>
              </Link>
              <Link to="/cart" className="profile-quick-link">
                <i className="fas fa-shopping-cart" />
                <span>Panier</span>
              </Link>
              <button
                type="button"
                className="profile-quick-link profile-quick-link--btn"
                onClick={() => setActiveTab('orders')}
              >
                <i className="fas fa-box" />
                <span>Mes commandes</span>
              </button>
            </div>
          </div>
          </div>

          <div className="profile-card">
            <div className="profile-tabs">
          <button
            className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <i className="fas fa-user"></i>
            <span>Informations</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <i className="fas fa-shopping-bag"></i>
            <span>Mes Commandes</span>
            {orders.length > 0 && (
              <span className="tab-badge">{orders.length}</span>
            )}
          </button>
        </div>

        {/* Message de statut */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-content">
          {/* ONGLET INFORMATIONS */}
          {activeTab === 'info' && (
            <>
              {!isEditing ? (
                <>
                  <div className="profile-info">
                    <div className="profile-section">
                      <h3>Identité</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Prénom</span>
                          <span className="info-value">{user.first_name || '—'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Nom</span>
                          <span className="info-value">{user.last_name || '—'}</span>
                        </div>
                        {user.username && (
                          <div className="info-item">
                            <span className="info-label">Nom d'utilisateur</span>
                            <span className="info-value">{user.username}</span>
                          </div>
                        )}
                        <div className="info-item">
                          <span className="info-label">Email (identifiant de connexion)</span>
                          <span className="info-value">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="profile-section">
                      <h3>Coordonnées</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Téléphone</span>
                          <span className="info-value">{user.phone_number || 'Non renseigné'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="profile-section">
                      <h3>Adresse de livraison</h3>
                      <div className="info-grid">
                        <div className="info-item info-item--full">
                          <span className="info-label">Adresse</span>
                          <span className="info-value">{user.address || 'Non renseignée'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Ville</span>
                          <span className="info-value">{user.city || 'Non renseignée'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Pays</span>
                          <span className="info-value">{user.country || 'Non renseigné'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="profile-section">
                      <h3>Préférences & compte</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Newsletter</span>
                          <span className="info-value">
                            {user.receive_newsletter ? 'Oui, abonné(e)' : 'Non abonné(e)'}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Inscription</span>
                          <span className="info-value">
                            {user.date_joined
                              ? new Date(user.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="profile-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setIsEditing(true)}
                    >
                      Modifier le profil
                    </button>
                    <button
                      type="button"
                      className="btn-logout"
                      onClick={handleLogout}
                    >
                      Se déconnecter
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="profile-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="first_name">Prénom *</label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="last_name">Nom *</label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled
                        className="disabled-input"
                      />
                      <small className="form-hint">
                        L'email ne peut pas être modifié
                      </small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone_number">Téléphone</label>
                      <input
                        type="tel"
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="+241 XX XX XX XX"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="address">Adresse</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="123 Rue de l'Exemple"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="city">Ville</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Port-Gentil"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="country">Pays</label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        placeholder="Gabon"
                      />
                    </div>
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="receive_newsletter"
                        checked={formData.receive_newsletter}
                        onChange={handleChange}
                      />
                      <span className="checkbox-custom"></span>
                      Je souhaite recevoir la newsletter
                    </label>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsEditing(false)}
                      disabled={loading}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ONGLET COMMANDES */}
          {activeTab === 'orders' && (
            <div className="orders-section">
              {loadingOrders ? (
                <div className="loading-container">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Chargement de vos commandes...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="empty-orders">
                  <i className="fas fa-shopping-bag"></i>
                  <h3>Aucune commande</h3>
                  <p>Vous n'avez pas encore passé de commande.</p>
                  <button
                    className="btn-primary"
                    onClick={() => navigate('/catalog')}
                  >
                    Découvrir le catalogue
                  </button>
                </div>
              ) : (
                <div className="orders-list">
                  {orders.map((order) => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div className="order-info">
                          <h4>Commande #{order.id}</h4>
                          <p className="order-date">
                            <i className="far fa-calendar"></i>
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="order-items">
                        {order.items.map((item) => (
                          <div key={item.id} className="order-item">
                            <img
                              src={item.book.cover_image || '/images/default-book-cover.jpg'}
                              alt={item.book.title}
                                loading="lazy"
                                decoding="async"
                            />
                            <div className="item-details">
                              <h5>{item.book.title}</h5>
                              <p>{item.book.author?.full_name}</p>
                              <span className="item-quantity">Quantité : {item.quantity}</span>
                            </div>
                            <div className="item-price">
                              {formatPrice(item.price * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="order-footer">
                        <div className="order-shipping">
                          <p>
                            <strong>Livraison :</strong> {order.shipping_address}, {order.shipping_city}
                          </p>
                          <p>
                            <strong>Téléphone :</strong> {order.shipping_phone}
                          </p>
                        </div>
                        <div className="order-total">
                          <span>Total :</span>
                          <strong>{formatPrice(order.total_amount)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;