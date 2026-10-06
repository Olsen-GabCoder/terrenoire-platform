import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDeliveryConfig } from '../context/DeliveryConfigContext';
import orderService from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';
import TnAlert from '../components/ui/TnAlert';
import '../styles/Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const retryOrderId = searchParams.get('retry');

  const { cartItems, appliedCoupon, clearCart, getTotalPrice, getTotalItems } = useCart();
  const { shippingFreeThreshold, shippingCost } = useDeliveryConfig();
  const { user, isAuthenticated, authChecked } = useAuth();

  const [formData, setFormData] = useState({
    shipping_address: '',
    shipping_phone: '',
    shipping_city: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('moov_money');
  const [phoneForPayment, setPhoneForPayment] = useState('');

  // Retry mode state
  const [retryOrder, setRetryOrder] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);

  // En mode retry le panier est vide : on se base sur les articles de la commande
  const hasPhysical = retryOrder
    ? (retryOrder.items || []).some((i) => (i.format_purchased || 'PAPIER') === 'PAPIER')
    : cartItems.some((i) => i.format_purchased === 'PAPIER');

  // Load retry order if ?retry=N
  useEffect(() => {
    if (!retryOrderId || !isAuthenticated) return;
    let cancelled = false;
    setRetryLoading(true);

    orderService.getOrderById(retryOrderId).then((order) => {
      if (cancelled) return;
      if (order.status !== 'PENDING') {
        setError('Cette commande ne peut plus être payée.');
        setRetryLoading(false);
        return;
      }
      setRetryOrder(order);
      setFormData({
        shipping_address: order.shipping_address || '',
        shipping_phone: order.shipping_phone || '',
        shipping_city: order.shipping_city || '',
      });
      if (order.shipping_phone) {
        const digits = order.shipping_phone.replace(/\D/g, '').slice(-9);
        if (digits.length >= 8) setPhoneForPayment(digits);
      }
      setRetryLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError('Commande introuvable.');
      setRetryLoading(false);
    });

    return () => { cancelled = true; };
  }, [retryOrderId, isAuthenticated]);

  useEffect(() => {
    if (orderPlaced || !authChecked) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: retryOrderId ? `/checkout?retry=${retryOrderId}` : '/checkout' } });
      return;
    }

    // In retry mode, don't redirect if cart is empty
    if (!retryOrderId && cartItems.length === 0) {
      navigate('/cart');
      return;
    }

    if (user && !retryOrderId) {
      // Pré-remplir sans écraser ce que l'utilisateur a déjà saisi
      setFormData((prev) => ({
        shipping_address: prev.shipping_address || user.address || '',
        shipping_phone: prev.shipping_phone || user.phone_number || '',
        shipping_city: prev.shipping_city || user.city || '',
      }));
      if (user.phone_number) {
        const digits = user.phone_number.replace(/\D/g, '').slice(-9);
        if (digits.length >= 8) setPhoneForPayment((prev) => prev || digits);
      }
    }
  }, [authChecked, isAuthenticated, cartItems, user, navigate, retryOrderId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + ' FCFA';
  };

  const isMobileMoney = paymentMethod === 'moov_money' || paymentMethod === 'airtel_money';
  const phoneDigits = phoneForPayment.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length >= 8 && phoneDigits.length <= 9;
  const canSubmit = !isProcessing && (!isMobileMoney || isPhoneValid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isMobileMoney && !isPhoneValid) {
      setError('Veuillez saisir un numéro de téléphone valide (8 ou 9 chiffres).');
      return;
    }

    setIsProcessing(true);

    try {
      // In retry mode, reuse existing order; otherwise create new one
      let order;
      if (retryOrder) {
        order = retryOrder;
      } else {
        const orderData = {
          items: cartItems.map((item) => ({
            book_id: item.id,
            quantity: item.quantity,
            format_purchased: item.format_purchased || 'PAPIER',
          })),
          shipping_address: formData.shipping_address,
          shipping_phone: formData.shipping_phone,
          shipping_city: formData.shipping_city,
          ...(appliedCoupon?.code && { coupon_code: appliedCoupon.code }),
        };
        order = await orderService.createOrder(orderData);
      }

      if (isMobileMoney) {
        try {
          const result = await orderService.initiatePayment(
            order.id,
            paymentMethod,
            phoneDigits
          );

          sessionStorage.setItem('current_payment_ref', result.bamboo_ref);
          sessionStorage.setItem('current_order_id', String(order.id));

          if (!retryOrder) {
            setOrderPlaced(true);
            clearCart();
          }

          navigate(`/checkout/paiement/${result.bamboo_ref}`, {
            state: {
              orderId: order.id,
              operator: paymentMethod,
              phone: phoneDigits,
              amount: order.total_amount,
            },
          });
        } catch (payErr) {
          console.error('initiatePayment failed:', payErr);
          // La commande existe déjà : on bascule en mode retry pour qu'un nouveau
          // clic réutilise cette commande au lieu d'en créer une seconde.
          if (!retryOrder) {
            setRetryOrder(order);
            setOrderPlaced(true);
            clearCart();
            setSearchParams({ retry: String(order.id) }, { replace: true });
          }
          setError(
            payErr.response?.data?.error ||
              payErr.response?.data?.detail ||
              'Impossible d\u2019initier le paiement. Veuillez réessayer.'
          );
        }
      } else {
        if (!retryOrder) {
          setOrderPlaced(true);
          clearCart();
        }
        navigate('/order-success', {
          state: { orderId: order.id, orderData: order },
        });
      }
    } catch (err) {
      console.error('Erreur lors de la création de la commande:', err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          'Une difficulté est survenue lors de la création de la commande'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated || (!retryOrderId && cartItems.length === 0) || retryLoading) {
    return <LoadingSpinner fullPage={true} />;
  }

  return (
    <div className="chk-page">
      <section className="chk-hero">
        <div className="chk-hero__orb" />
        <div className="chk-hero__grid-bg" />
        <div className="chk-hero__inner">
          <div className="chk-hero__line" />
          <h1 className="chk-hero__title">Finaliser la commande</h1>
          <p className="chk-hero__sub">
            Vérifiez vos informations de livraison avant de confirmer.
          </p>
        </div>
      </section>
      <div className="chk-hero-fade" />

      <form onSubmit={handleSubmit} className="chk-content">
        {retryOrder && (
          <div className="chk-retry-banner">
            <i className="fas fa-redo" />
            <div className="chk-retry-banner__text">
              <strong>Nouvelle tentative de paiement</strong>
              <span>Commande #{retryOrder.id} — {formatPrice(retryOrder.total_amount)}</span>
            </div>
          </div>
        )}

        <div className="chk-layout">
        <div className="chk-main">
          <div className="chk-section">
            <span className="chk-section__tag">Livraison</span>
            <h2>Informations de livraison</h2>

            <div className="chk-form-group">
              <label htmlFor="shipping_address">
                Adresse complète {hasPhysical && <span className="required">*</span>}
              </label>
              <textarea
                id="shipping_address"
                name="shipping_address"
                value={formData.shipping_address}
                onChange={handleChange}
                placeholder={hasPhysical ? 'Numéro, Rue, Avenue, Quartier...' : 'Adresse (facultative pour les ebooks)'}
                required={hasPhysical}
                rows="3"
              />
            </div>

            <div className="chk-form-row">
              <div className="chk-form-group">
                <label htmlFor="shipping_city">
                  Ville {hasPhysical && <span className="required">*</span>}
                </label>
                <input
                  type="text"
                  id="shipping_city"
                  name="shipping_city"
                  value={formData.shipping_city}
                  onChange={handleChange}
                  placeholder={hasPhysical ? 'Ex: Port-Gentil' : 'Ville (facultative pour les ebooks)'}
                  required={hasPhysical}
                />
              </div>

              <div className="chk-form-group">
                <label htmlFor="shipping_phone">
                  Numéro de téléphone {hasPhysical && <span className="required">*</span>}
                </label>
                <input
                  type="tel"
                  id="shipping_phone"
                  name="shipping_phone"
                  value={formData.shipping_phone}
                  onChange={handleChange}
                  placeholder={hasPhysical ? '+241 XX XX XX XX' : 'Téléphone (facultatif pour les ebooks)'}
                  required={hasPhysical}
                />
              </div>
            </div>

            {cartItems.some((i) => i.format_purchased === 'PAPIER') && (
              <TnAlert variant="info" style={{ marginTop: 12 }}>
                Terre Noire Editions livre les exemplaires physiques uniquement a Libreville, Port-Gentil et Lambarene. Si vous residez ailleurs, vous devez venir recuperer votre commande dans l'une de ces trois villes.
              </TnAlert>
            )}

            {error && (
              <div className="chk-error">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="chk-sidebar">
          <div className="chk-summary">
            <span className="chk-summary__tag">Récapitulatif</span>
            <h2>Votre commande</h2>

            {retryOrder ? (
              /* Retry mode: show order total only (cart is empty) */
              <div className="chk-totals">
                <div className="chk-total-row">
                  <span>Commande #{retryOrder.id}</span>
                  <span>{formatPrice(retryOrder.total_amount)}</span>
                </div>
                <div className="chk-total-row chk-total-row--final">
                  <span>Total à payer</span>
                  <span>{formatPrice(retryOrder.total_amount)}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="chk-summary-items">
                  {cartItems.map((item) => (
                    <div key={`${item.id}_${item.format_purchased}`} className="chk-summary-item">
                      <img
                        src={item.cover_image || '/images/default-book-cover.jpg'}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="chk-item-info">
                        <h4>{item.title}</h4>
                        <p>{item.author?.full_name}</p>
                        <span className="chk-item-qty">{item.format_purchased === 'EBOOK' ? 'Ebook' : 'Papier'} · Qté : {item.quantity}</span>
                      </div>
                      <div className="chk-item-price">
                        {item.original_price && Number(item.original_price) > Number(item.price) && (
                          <span className="chk-item-old-price">{formatPrice(item.original_price)}</span>
                        )}
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {(() => {
                  const subtotal = getTotalPrice();
                  const hasPhysical = cartItems.some((i) => i.format_purchased === 'PAPIER');
                  const shipping = !hasPhysical ? 0 : subtotal >= shippingFreeThreshold ? 0 : shippingCost;
                  const discountPercent = appliedCoupon?.discountPercent ?? 0;
                  const discountFixed = appliedCoupon?.discountAmount ?? 0;
                  const discountAmt = discountPercent > 0
                    ? (subtotal * discountPercent) / 100
                    : Math.min(discountFixed, subtotal);
                  const total = subtotal - discountAmt + shipping;
                  return (
                    <div className="chk-totals">
                      <div className="chk-total-row">
                        <span>Sous-total ({getTotalItems()} article{getTotalItems() > 1 ? 's' : ''})</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                      {discountAmt > 0 && (
                        <div className="chk-total-row" style={{ color: 'var(--color-success)' }}>
                          <span>Réduction {appliedCoupon?.code && `(${appliedCoupon.code})`}</span>
                          <span>-{formatPrice(discountAmt)}</span>
                        </div>
                      )}
                      <div className="chk-total-row">
                        <span>Livraison {shipping === 0 && <em style={{ color: 'var(--color-success)' }}>Gratuit</em>}</span>
                        <span>{shipping === 0 ? 'Gratuit' : formatPrice(shipping)}</span>
                      </div>
                      <div className="chk-total-row chk-total-row--final">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* ═══ Section paiement ═══ */}
            <div className="chk-pay">
              <span className="chk-pay__tag">Paiement</span>
              <h3 className="chk-pay__title">Mode de paiement</h3>

              <div className="chk-pay__options">
                {[
                  { value: 'moov_money', name: 'Moov Money', desc: 'Paiement mobile instantané', icon: 'fas fa-mobile-alt', iconClass: 'chk-pay__icon--moov', badge: 'Recommandé' },
                  { value: 'airtel_money', name: 'Airtel Money', desc: 'Paiement mobile instantané', icon: 'fas fa-mobile-alt', iconClass: 'chk-pay__icon--airtel' },
                  { value: 'cash', name: 'Espèces à la livraison', desc: 'Paiement en main propre', icon: 'fas fa-money-bill-wave', iconClass: 'chk-pay__icon--cash', disabled: true, badgeSoon: 'Bientôt' },
                  { value: 'visa', name: 'Carte Visa', desc: 'Paiement par carte bancaire', icon: 'fab fa-cc-visa', iconClass: 'chk-pay__icon--visa', disabled: true, badgeSoon: 'Bientôt' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`chk-pay__option${paymentMethod === opt.value ? ' chk-pay__option--selected' : ''}${opt.disabled ? ' chk-pay__option--disabled' : ''}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={opt.value}
                      className="chk-pay__radio"
                      checked={paymentMethod === opt.value}
                      disabled={opt.disabled}
                      onChange={() => setPaymentMethod(opt.value)}
                    />
                    <span className="chk-pay__indicator" />
                    <span className={`chk-pay__icon ${opt.iconClass}`}>
                      <i className={opt.icon} />
                    </span>
                    <span className="chk-pay__label">
                      <span className="chk-pay__name">
                        {opt.name}
                        {opt.badge && <span className="chk-pay__badge">{opt.badge}</span>}
                        {opt.badgeSoon && <span className="chk-pay__badge chk-pay__badge--soon">{opt.badgeSoon}</span>}
                      </span>
                      <span className="chk-pay__desc">{opt.desc}</span>
                    </span>
                  </label>
                ))}
              </div>

              {isMobileMoney && (
                <div className="chk-pay__phone">
                  <label className="chk-pay__phone-label" htmlFor="phone_payment">
                    Numéro de téléphone (mobile money) <span className="required">*</span>
                  </label>
                  <div className="chk-pay__phone-wrap">
                    <span className="chk-pay__phone-prefix">+241</span>
                    <input
                      type="tel"
                      id="phone_payment"
                      className="chk-pay__phone-input"
                      placeholder="07 XX XX XX"
                      maxLength="11"
                      value={phoneForPayment}
                      onChange={(e) => setPhoneForPayment(e.target.value.replace(/[^\d\s]/g, ''))}
                    />
                  </div>
                  <p className="chk-pay__phone-hint">
                    {isPhoneValid
                      ? 'Vous recevrez une demande de validation sur ce numéro.'
                      : phoneForPayment.length > 0
                        ? 'Le numéro doit comporter 8 ou 9 chiffres.'
                        : 'Saisissez le numéro associé à votre compte mobile money.'}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="chk-btn"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> Traitement en cours…
                </>
              ) : (
                <>
                  <span>Confirmer et payer</span>
                  <i className="fas fa-arrow-right" />
                </>
              )}
            </button>

            <div className="chk-badges">
              <div className="chk-badge">
                <i className="fas fa-lock" />
                <span>Paiement sécurisé</span>
              </div>
              <div className="chk-badge">
                <i className="fas fa-truck" />
                <span>Livraison rapide</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </form>
      <div className="chk-footer-fade" />
    </div>
  );
};

export default Checkout;