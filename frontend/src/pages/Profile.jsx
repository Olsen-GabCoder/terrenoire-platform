import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import { formatPhoneDisplay, formatPhoneTyping, phoneForInput, phoneForApi, validatePhone } from '../utils/phone';
import '../styles/Profile.css';
import TnBookCover from '../components/ui/TnBookCover';

const STATUS = {
  PENDING: { key: 'pending', label: 'En attente' },
  PAID: { key: 'paid', label: 'Payée' },
  SHIPPED: { key: 'shipped', label: 'Expédiée' },
  CANCELLED: { key: 'cancelled', label: 'Annulée' },
};

const formatShortDate = (value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const Profile = () => {
  const { user, authChecked, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Arrivée depuis le checkout pour compléter le profil : formulaire ouvert, retour au checkout après enregistrement
  const fromCheckout = location.state?.from === '/checkout';
  const messageRef = useRef(null);

  const [isEditing, setIsEditing] = useState(fromCheckout);
  const [fieldErrors, setFieldErrors] = useState({});
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
        phone_number: phoneForInput(user.phone_number),
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
      [name]: type === 'checkbox' ? checked : name === 'phone_number' ? formatPhoneTyping(value) : value
    }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
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
    setMessage({ type: '', text: '' });

    const phoneError = validatePhone(formData.phone_number, { required: fromCheckout, allowForeign: true });
    if (phoneError) {
      setFieldErrors({ phone_number: phoneError });
      showMessage('error', 'Vérifiez le numéro de téléphone.');
      return;
    }
    setLoading(true);

    try {
      const updateData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: phoneForApi(formData.phone_number),
        address: formData.address,
        city: formData.city,
        country: formData.country,
        receive_newsletter: formData.receive_newsletter,
      };

      const result = await updateProfile(updateData);
      
      if (result.success) {
        setFieldErrors({});
        if (fromCheckout) {
          navigate('/checkout');
          return;
        }
        showMessage('success', 'Profil mis à jour.');
        setIsEditing(false);
      } else {
        setFieldErrors(result.fieldErrors || {});
        showMessage('error', result.error || 'La mise à jour a échoué. Réessayez.');
      }
    } catch {
      showMessage('error', 'La mise à jour a échoué. Réessayez.');
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

  const totalSpent = useMemo(() => {
    // Seules les commandes payées comptent dans le total dépensé
    return orders
      .filter((o) => o.status === 'PAID' || o.status === 'SHIPPED')
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  }, [orders]);

  const memberSince = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Utilisateur';
  const initials = (user?.first_name?.charAt(0) || '') + (user?.last_name?.charAt(0) || '') || (user?.username?.charAt(0) || 'U');

  // Ma bibliothèque : ebooks des commandes payées (sans doublon)
  const ebooks = useMemo(() => {
    const seen = new Set();
    const list = [];
    orders
      .filter((o) => o.status === 'PAID' || o.status === 'SHIPPED')
      .forEach((o) => (o.items || []).forEach((item) => {
        if (item.format_purchased === 'EBOOK' && item.book && !seen.has(item.book.id)) {
          seen.add(item.book.id);
          list.push(item.book);
        }
      }));
    return list;
  }, [orders]);

  const recentOrders = orders.slice(0, 3);

  // Ce qui manque pour pouvoir commander (le serveur exige nom + téléphone,
  // et adresse + ville pour un livre papier)
  const missing = [
    !user?.first_name || !user?.last_name ? 'vos nom et prénom' : null,
    !user?.phone_number ? 'votre téléphone' : null,
    !user?.address || !user?.city ? 'votre adresse (pour les livres papier)' : null,
  ].filter(Boolean);

  const infoCardRef = useRef(null);
  // Arrivée depuis la commande : aller directement au formulaire
  useEffect(() => {
    if (fromCheckout && user) {
      const t = setTimeout(() => infoCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [fromCheckout, user]);
  const startEditing = () => {
    setMessage({ type: '', text: '' });
    setIsEditing(true);
    setTimeout(() => infoCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

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
              <label
                className={`profile-hero-avatar profile-hero-avatar--editable ${avatarLoading ? 'is-loading' : ''}`}
                htmlFor="profile-avatar-input"
                aria-label="Changer la photo de profil"
              >
                {user.profile_image ? (
                  <img src={user.profile_image} alt="" className="profile-hero-avatar-img" />
                ) : (
                  <span className="profile-hero-avatar-initials">{initials.toUpperCase()}</span>
                )}
                {avatarLoading && (
                  <span className="profile-hero-avatar-overlay">
                    <i className="fas fa-spinner fa-spin" />
                  </span>
                )}
              </label>
              {/* Badge appareil photo : visible en permanence (pas de survol sur mobile) */}
              <label htmlFor="profile-avatar-input" className="pf-avatar-badge" aria-hidden="true">
                <i className="fas fa-camera" />
              </label>
              <input
                id="profile-avatar-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="profile-hero-avatar-input"
                onChange={handleAvatarChange}
                disabled={avatarLoading}
              />
            </div>
          </div>
          <h1 className="profile-hero-title">{displayName}</h1>
          <p className="profile-hero-email">{user.email}</p>
          {memberSince && <p className="profile-hero-since">Membre depuis {memberSince}</p>}
        </div>
      </section>
      <div className="tn-motif-strip" style={{ opacity: 0.6 }} aria-hidden="true" />

      <section className="pf-body">
        <div className="pf-wrap">
          {fromCheckout && isEditing && (
            <div className="message info" role="status">
              Complétez vos coordonnées pour finaliser votre commande : vous reviendrez au paiement juste après.
            </div>
          )}
          {message.text && (
            <div className={`message ${message.type}`} role="alert" ref={messageRef}>
              {message.text}
            </div>
          )}
          {!isEditing && missing.length > 0 && (
            <div className="pf-alert" role="status">
              <i className="fas fa-circle-exclamation" aria-hidden="true" />
              <p>
                <strong>Profil à compléter.</strong> Ajoutez {missing.join(', ')} pour pouvoir commander.
              </p>
              <button type="button" className="pf-alert__btn" onClick={startEditing}>Compléter</button>
            </div>
          )}

          <div className="pf-layout">
            <div className="pf-col pf-col--side">
              {/* ── Chiffres ── */}
              <div className="pf-stats">
                <div className="pf-stat">
                  <span className="pf-stat__value">{orders.length}</span>
                  <span className="pf-stat__label">commande{orders.length > 1 ? 's' : ''}</span>
                </div>
                <div className="pf-stat">
                  <span className="pf-stat__value">{formatPrice(totalSpent)}</span>
                  <span className="pf-stat__label">dépensés</span>
                </div>
                <div className="pf-stat">
                  <span className="pf-stat__value">{ebooks.length}</span>
                  <span className="pf-stat__label">ebook{ebooks.length > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* ── Ma bibliothèque ── */}
              <section className="pf-card" aria-labelledby="pf-library-title">
                <div className="pf-card__head">
                  <h2 id="pf-library-title" className="pf-card__title">Ma <em>bibliothèque</em></h2>
                </div>
                {loadingOrders && orders.length === 0 ? (
                  <p className="pf-muted"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Chargement…</p>
                ) : ebooks.length === 0 ? (
                  <div className="pf-empty">
                    <p>Vos ebooks achetés apparaîtront ici, prêts à être lus.</p>
                    <Link to="/catalog" className="pf-link">Découvrir le catalogue <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
                  </div>
                ) : (
                  <ul className="pf-library">
                    {ebooks.map((book) => (
                      <li key={book.id} className="pf-library__item">
                        <span className="pf-library__cover">
                          {book.cover_image
                            ? <img src={book.cover_image} alt="" loading="lazy" decoding="async" />
                            : <TnBookCover book={book} variant="compact" />}
                        </span>
                        <span className="pf-library__text">
                          <span className="pf-library__title">{book.title}</span>
                          {book.author?.full_name && <span className="pf-library__author">{book.author.full_name}</span>}
                        </span>
                        <Link to={`/books/${book.id}/read`} className="tn-btn tn-btn--primary tn-btn--sm pf-library__read">
                          <i className="fas fa-book-open-reader" aria-hidden="true" /> Lire
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ── Commandes récentes ── */}
              <section className="pf-card" aria-labelledby="pf-orders-title">
                <div className="pf-card__head">
                  <h2 id="pf-orders-title" className="pf-card__title">Commandes <em>récentes</em></h2>
                </div>
                {loadingOrders && orders.length === 0 ? (
                  <p className="pf-muted"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Chargement…</p>
                ) : recentOrders.length === 0 ? (
                  <div className="pf-empty">
                    <p>Vous n&apos;avez pas encore passé de commande.</p>
                    <Link to="/catalog" className="pf-link">Découvrir le catalogue <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
                  </div>
                ) : (
                  <>
                    <ul className="pf-orders">
                      {recentOrders.map((order) => {
                        const st = STATUS[order.status] || STATUS.PENDING;
                        const count = (order.items || []).reduce((n, it) => n + (it.quantity || 1), 0);
                        return (
                          <li key={order.id}>
                            <Link to="/orders" className="pf-order">
                              <span className="pf-order__main">
                                <span className="pf-order__id">Commande #{order.id}</span>
                                <span className="pf-order__meta">
                                  {formatShortDate(order.created_at)} · {count} article{count > 1 ? 's' : ''}
                                </span>
                              </span>
                              <span className="pf-order__side">
                                <span className={`pf-status pf-status--${st.key}`}>{st.label}</span>
                                <span className="pf-order__total">{formatPrice(order.total_amount)}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    <Link to="/orders" className="pf-link pf-link--block">
                      Voir toutes mes commandes <i className="fas fa-arrow-right" aria-hidden="true" />
                    </Link>
                  </>
                )}
              </section>
            </div>

            <div className="pf-col pf-col--main">
              {/* ── Mes informations ── */}
              <section className="pf-card" ref={infoCardRef} aria-labelledby="pf-info-title">
                <div className="pf-card__head">
                  <h2 id="pf-info-title" className="pf-card__title">Mes <em>informations</em></h2>
                  {!isEditing && (
                    <button type="button" className="pf-edit-btn" onClick={startEditing}>
                      <i className="fas fa-pen" aria-hidden="true" /> Modifier
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <dl className="pf-info">
                    <div className="pf-info__row">
                      <dt>Nom</dt>
                      <dd>{[user.first_name, user.last_name].filter(Boolean).join(' ') || <span className="pf-missing">À renseigner</span>}</dd>
                    </div>
                    <div className="pf-info__row">
                      <dt>E-mail</dt>
                      <dd>{user.email}</dd>
                    </div>
                    {user.username && (
                      <div className="pf-info__row">
                        <dt>Identifiant</dt>
                        <dd>{user.username}</dd>
                      </div>
                    )}
                    <div className="pf-info__row">
                      <dt>Téléphone</dt>
                      <dd>{user.phone_number ? formatPhoneDisplay(user.phone_number) : <span className="pf-missing">À renseigner</span>}</dd>
                    </div>
                    <div className="pf-info__row">
                      <dt>Adresse</dt>
                      <dd>
                        {user.address || user.city ? (
                          <>
                            {user.address && <span className="pf-info__line">{user.address}</span>}
                            <span className="pf-info__line">{[user.city, user.country].filter(Boolean).join(', ')}</span>
                          </>
                        ) : <span className="pf-missing">À renseigner</span>}
                      </dd>
                    </div>
                    <div className="pf-info__row">
                      <dt>Newsletter</dt>
                      <dd>{user.receive_newsletter ? 'Abonné(e)' : 'Non abonné(e)'}</dd>
                    </div>
                  </dl>
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
                      <label htmlFor="phone_number">Téléphone *</label>
                      <input
                        type="tel"
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="074 30 16 39"
                        inputMode="tel"
                        autoComplete="tel-national"
                        aria-invalid={!!fieldErrors.phone_number}
                        aria-describedby="phone_number_hint"
                      />
                      <small id="phone_number_hint" className={`form-hint${fieldErrors.phone_number ? ' form-hint--error' : ''}`}>
                        {fieldErrors.phone_number || 'Nécessaire pour commander. Ex. 074 30 16 39'}
                      </small>
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="address">Adresse</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Quartier, rue, repère…"
                        autoComplete="street-address"
                      />
                      <small className="form-hint">Nécessaire pour la livraison d&apos;un livre papier</small>
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
                        autoComplete="address-level2"
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
                      onClick={() => { setIsEditing(false); setFieldErrors({}); }}
                      disabled={loading}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
                )}
              </section>

              {/* ── Compte ── */}
              <section className="pf-card" aria-labelledby="pf-account-title">
                <div className="pf-card__head">
                  <h2 id="pf-account-title" className="pf-card__title">Compte</h2>
                </div>
                <Link to="/settings" className="pf-row-link">
                  <i className="fas fa-lock" aria-hidden="true" />
                  <span>Mot de passe et notifications</span>
                  <i className="fas fa-chevron-right pf-row-link__chevron" aria-hidden="true" />
                </Link>
                <button type="button" className="pf-row-link pf-row-link--danger" onClick={handleLogout}>
                  <i className="fas fa-arrow-right-from-bracket" aria-hidden="true" />
                  <span>Se déconnecter</span>
                </button>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;