import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/Orders.css';

const Orders = () => {
  const { user, authChecked } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      navigate('/login', { state: { from: '/orders' } });
      return;
    }
    loadOrders();
  }, [authChecked, user, navigate]);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getOrders({ page_size: 50 });
      setOrders(response.results || response);
    } catch (err) {
      setError("Le chargement de vos commandes n'a pas abouti.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    setDownloadingId(orderId);
    try {
      await orderService.downloadInvoice(orderId);
    } catch (err) {
      console.error(err);
      setError("La facture n'a pas pu être téléchargée.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    setCancellingId(orderId);
    try {
      await orderService.cancelOrder(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: 'CANCELLED' } : o
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Impossible d\'annuler la commande.');
    } finally {
      setCancellingId(null);
    }
  };

  const formatPrice = (price) => {
    return Math.round(parseFloat(price)).toLocaleString('fr-FR') + ' FCFA';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      PENDING: { label: 'En attente', class: 'ord-status--pending' },
      PAID: { label: 'Payé', class: 'ord-status--paid' },
      SHIPPED: { label: 'Expédié', class: 'ord-status--shipped' },
      CANCELLED: { label: 'Annulé', class: 'ord-status--cancelled' },
    };
    return configs[status] || configs.PENDING;
  };

  if (!user) return null;

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="ord-page">
      <section className="ord-hero">
        <div className="ord-hero__orb ord-hero__orb--1" />
        <div className="ord-hero__orb ord-hero__orb--2" />
        <div className="ord-hero__grid-bg" />
        <div className="ord-hero__inner">
          <div className="ord-hero__line" />
          <h1 className="ord-hero__title">Mes commandes</h1>
          <p className="ord-hero__sub">
            Consultez l&apos;historique de vos commandes et suivez leur statut.
          </p>
          {orders.length > 0 && (
            <p className="ord-hero__count">
              <strong>{orders.length}</strong> commande{orders.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </section>
      <div className="ord-hero-fade" />

      <div className="ord-content">
        <div className="ord-wrap">
          {error && (
            <div className="ord-error">
              <i className="fas fa-exclamation-circle" /> {error}
            </div>
          )}

          {orders.length === 0 ? (
            <div className="ord-empty">
              <div className="ord-empty__ico">
                <i className="fas fa-shopping-bag" />
              </div>
              <h2>Aucun ouvrage n&apos;a encore quitté nos étagères pour vous</h2>
              <p>Vos commandes apparaîtront ici dès qu&apos;une histoire prendra le chemin de votre bibliothèque.</p>
              <Link to="/catalog" className="ord-btn ord-btn--primary">
                <i className="fas fa-book" /> Découvrir nos titres
              </Link>
            </div>
          ) : (
            <div className="ord-list">
              {orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <article key={order.id} className="ord-card">
                    <div className="ord-card__header">
                      <div className="ord-card__info">
                        <h3 className="ord-card__id">Commande #{order.id}</h3>
                        <p className="ord-card__date">
                          <i className="far fa-calendar-alt" />
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <span className={`ord-status ${statusConfig.class}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="ord-card__items">
                      {(order.items || []).map((item) => (
                        <div key={item.id} className="ord-item">
                          <Link
                            to={`/books/${item.book?.id}`}
                            className="ord-item__cover"
                          >
                            <img
                              src={item.book?.cover_image || '/images/default-book-cover.jpg'}
                              alt={item.book?.title}
                                loading="lazy"
                                decoding="async"
                            />
                          </Link>
                          <div className="ord-item__details">
                            <Link to={`/books/${item.book?.id}`} className="ord-item__title">
                              {item.book?.title}
                            </Link>
                            <p className="ord-item__author">
                              {item.book?.author?.full_name || 'Auteur inconnu'}
                            </p>
                            <span className="ord-item__qty">
                              Quantité : {item.quantity}
                            </span>
                            {order.status === 'PAID' && item.format_purchased === 'EBOOK' && (
                              <Link
                                to={`/books/${item.book?.id}/read`}
                                className="ord-btn ord-btn--read"
                              >
                                <i className="fas fa-book-reader" /> Lire mon ebook
                              </Link>
                            )}
                          </div>
                          <div className="ord-item__price">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="ord-card__footer">
                      <div className="ord-card__shipping">
                        <p>
                          <strong>Livraison :</strong>{' '}
                          {order.shipping_address}, {order.shipping_city}
                        </p>
                        <p>
                          <strong>Téléphone :</strong> {order.shipping_phone}
                        </p>
                      </div>
                      <div className="ord-card__total">
                        <span>Total</span>
                        <strong>{formatPrice(order.total_amount)}</strong>
                      </div>
                    </div>

                    <div className="ord-card__actions">
                      <button
                        type="button"
                        className="ord-btn ord-btn--outline"
                        onClick={() => handleDownloadInvoice(order.id)}
                        disabled={downloadingId === order.id}
                      >
                        {downloadingId === order.id ? (
                          <><i className="fas fa-spinner fa-spin" /> Téléchargement…</>
                        ) : (
                          <><i className="fas fa-file-pdf" /> Télécharger la facture</>
                        )}
                      </button>
                      {order.status === 'PENDING' && (
                        <>
                          <Link
                            to={`/checkout?retry=${order.id}`}
                            className="ord-btn ord-btn--primary"
                          >
                            <i className="fas fa-mobile-alt" /> Payer cette commande
                          </Link>
                          <button
                            type="button"
                            className="ord-btn ord-btn--danger"
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancellingId === order.id}
                          >
                            {cancellingId === order.id ? (
                              <><i className="fas fa-spinner fa-spin" /> Annulation…</>
                            ) : (
                              <><i className="fas fa-times" /> Annuler la commande</>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="ord-footer-fade" />
    </div>
  );
};

export default Orders;
