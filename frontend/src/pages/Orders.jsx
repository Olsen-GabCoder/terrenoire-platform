import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/Orders.css';
import { formatPhoneDisplay } from '../utils/phone';
import { parseApiError } from '../services/api';
import { TnBookCover } from '../components/ui';
import PageHero from '../components/ui/PageHero';
import EmptyState from '../components/ui/EmptyState';

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
    if (!window.confirm(`Annuler la commande #${orderId} ? Cette action est définitive.`)) return;
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
      setError(parseApiError(err).message);
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
      <PageHero
        compact
        title="Mes"
        accent="commandes"
        subtitle={orders.length > 0
          ? `${orders.length} commande${orders.length > 1 ? 's' : ''} · suivez leur statut et retrouvez vos ebooks.`
          : "Consultez l'historique de vos commandes et suivez leur statut."}
      />

      <div className="ord-content">
        <div className="ord-wrap">
          {error && (
            <div className="ord-error">
              <i className="fas fa-exclamation-circle" /> {error}
            </div>
          )}

          {orders.length === 0 ? (
            <EmptyState
              icon="fa-box-open"
              title="Aucun ouvrage n'a encore quitté nos étagères pour vous"
              text="Vos commandes apparaîtront ici dès qu'une histoire prendra le chemin de votre bibliothèque."
            >
              <Link to="/catalog" className="tn-btn tn-btn--primary tn-btn--lg">
                <i className="fas fa-book-open" /> Découvrir nos titres
              </Link>
            </EmptyState>
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
                            {item.book?.cover_image ? (
                              <img src={item.book.cover_image} alt="" loading="lazy" decoding="async" />
                            ) : (
                              <TnBookCover book={item.book || {}} variant="compact" />
                            )}
                          </Link>
                          <div className="ord-item__details">
                            <Link to={`/books/${item.book?.id}`} className="ord-item__title">
                              {item.book?.title}
                            </Link>
                            <p className="ord-item__author">
                              {item.book?.author?.full_name || 'Auteur inconnu'}
                            </p>
                            <span className="ord-item__qty">
                              <span className={`ord-item__format ord-item__format--${item.format_purchased === 'EBOOK' ? 'ebook' : 'paper'}`}>
                                {item.format_purchased === 'EBOOK' ? 'Ebook' : 'Papier'}
                              </span>
                              {item.format_purchased !== 'EBOOK' && <> · Quantité : {item.quantity}</>}
                            </span>
                            {['PAID', 'SHIPPED'].includes(order.status) && item.format_purchased === 'EBOOK' && (
                              <Link
                                to={`/books/${item.book?.id}/read`}
                                className="ord-btn ord-btn--read"
                              >
                                <i className="fas fa-book-open-reader" /> Lire mon ebook
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
                        {order.shipping_address ? (
                          <>
                            <p>
                              <strong>Livraison :</strong>{' '}
                              {[order.shipping_address, order.shipping_city].filter(Boolean).join(', ')}
                            </p>
                            {order.shipping_phone && (
                              <p>
                                <strong>Téléphone :</strong> {formatPhoneDisplay(order.shipping_phone)}
                              </p>
                            )}
                          </>
                        ) : (
                          <p>Commande numérique : aucune livraison.</p>
                        )}
                      </div>
                      <div className="ord-card__total">
                        <span>Total</span>
                        <strong>{formatPrice(order.total_amount)}</strong>
                      </div>
                    </div>

                    <div className="ord-card__actions">
                      {['PAID', 'SHIPPED'].includes(order.status) && (
                        <button
                          type="button"
                          className="ord-btn ord-btn--outline"
                          onClick={() => handleDownloadInvoice(order.id)}
                          disabled={downloadingId === order.id}
                        >
                          {downloadingId === order.id ? (
                            <><i className="fas fa-spinner fa-spin" /> Téléchargement…</>
                          ) : (
                            <><i className="fas fa-file-invoice" /> Télécharger la facture</>
                          )}
                        </button>
                      )}
                      {order.status === 'PENDING' && (
                        <>
                          <Link
                            to={`/checkout?retry=${order.id}`}
                            className="ord-btn ord-btn--primary"
                          >
                            <i className="fas fa-credit-card" /> Payer cette commande
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
    </div>
  );
};

export default Orders;
