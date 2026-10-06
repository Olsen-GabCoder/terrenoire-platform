import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDeliveryConfig } from '../context/DeliveryConfigContext';
import orderService from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';
import TnAlert from '../components/ui/TnAlert';
import { parseApiError } from '../services/api';
import {
  toLocalGabon, isGabonMobile, detectOperator, formatPhoneTyping,
  phoneForInput, phoneForApi, validatePhone,
} from '../utils/phone';
import '../styles/Checkout.css';
import TnBookCover from '../components/ui/TnBookCover';

const OPERATOR_NAMES = { moov_money: 'Moov Money', airtel_money: 'Airtel Money' };

const PAYMENT_METHODS = [
  { value: 'airtel_money', name: 'Airtel Money', desc: 'Validation sur votre téléphone', icon: 'fas fa-mobile-screen-button', iconClass: 'chk-pay__icon--airtel' },
  { value: 'moov_money', name: 'Moov Money', desc: 'Validation sur votre téléphone', icon: 'fas fa-mobile-screen-button', iconClass: 'chk-pay__icon--moov' },
  { value: 'bamboopay', name: 'BambooPay', desc: 'Paiement sur la page sécurisée BambooPay', icon: 'fas fa-lock', iconClass: 'chk-pay__icon--bamboopay' },
];

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
  const errorRef = useRef(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('airtel_money');
  // Tant que le client n'a pas choisi lui-même, l'opérateur suit le numéro saisi
  const [methodTouched, setMethodTouched] = useState(false);
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
        shipping_phone: prev.shipping_phone || phoneForInput(user.phone_number),
        shipping_city: prev.shipping_city || user.city || '',
      }));
      // Numéro de paiement : format local « 074 30 16 39 » (et non les 9 derniers chiffres
      // de +24174301639, qui donnaient « 174301639 »).
      if (isGabonMobile(user.phone_number)) {
        setPhoneForPayment((prev) => prev || formatPhoneTyping(user.phone_number));
      }
    }
  }, [authChecked, isAuthenticated, cartItems, user, navigate, retryOrderId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'shipping_phone' ? formatPhoneTyping(value) : value,
    }));
  };

  // Le numéro saisi détermine l'opérateur Mobile Money tant que le client n'a rien choisi
  useEffect(() => {
    if (methodTouched) return;
    const op = detectOperator(phoneForPayment);
    if (op && toLocalGabon(phoneForPayment).length === 9) setPaymentMethod(op);
  }, [phoneForPayment, methodTouched]);

  const showError = (message) => {
    setError(message);
    // Sur mobile l'erreur peut être hors écran : on la fait défiler jusqu'à elle
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  // Profil requis par le serveur : nom, prénom, téléphone ; adresse et ville pour un livre papier
  const missingProfile = user ? [
    !user.first_name && 'prénom',
    !user.last_name && 'nom',
    !user.phone_number && 'téléphone',
    hasPhysical && !user.address && 'adresse',
    hasPhysical && !user.city && 'ville',
  ].filter(Boolean) : [];

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + ' FCFA';
  };

  const isMobileMoney = paymentMethod === 'moov_money' || paymentMethod === 'airtel_money';
  const isBambooPay = paymentMethod === 'bamboopay';
  // Les deux modes Bamboo demandent le numéro du payeur
  const needsPhone = isMobileMoney || isBambooPay;
  const phoneDigits = toLocalGabon(phoneForPayment);
  const detectedOperator = detectOperator(phoneForPayment);
  const phoneError = validatePhone(phoneForPayment, { required: true, mobileOnly: isMobileMoney });
  const operatorMismatch = isMobileMoney && !phoneError && detectedOperator && detectedOperator !== paymentMethod;
  const isPhoneValid = !phoneError && !operatorMismatch;
  const canSubmit = !isProcessing && missingProfile.length === 0 && (!needsPhone || isPhoneValid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (missingProfile.length) {
      showError(`Votre profil est incomplet : renseignez ${missingProfile.join(', ')} dans « Mon profil ».`);
      return;
    }
    if (needsPhone && !isPhoneValid) {
      showError(operatorMismatch
        ? `Ce numéro est un numéro ${OPERATOR_NAMES[detectedOperator]} : choisissez ${OPERATOR_NAMES[detectedOperator]} comme mode de paiement.`
        : phoneError);
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
          shipping_address: hasPhysical ? formData.shipping_address : '',
          shipping_phone: hasPhysical ? phoneForApi(formData.shipping_phone) : '',
          shipping_city: hasPhysical ? formData.shipping_city : '',
          ...(appliedCoupon?.code && { coupon_code: appliedCoupon.code }),
        };
        order = await orderService.createOrder(orderData);
      }

      if (needsPhone) {
        try {
          const result = await orderService.initiatePayment(
            order.id,
            paymentMethod,
            phoneDigits
          );

          sessionStorage.setItem('current_payment_ref', result.bamboo_ref);
          sessionStorage.setItem('current_order_id', String(order.id));
          sessionStorage.setItem('current_payment_operator', paymentMethod);
          sessionStorage.setItem('current_payment_amount', String(order.total_amount));

          if (!retryOrder) {
            setOrderPlaced(true);
            clearCart();
          }

          if (result.redirect_url) {
            // Mode BambooPay : le client paie sur la page BambooPay, qui le renvoie
            // ensuite sur /checkout/paiement/<référence> où le statut est vérifié.
            window.location.assign(result.redirect_url);
            return;
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
          showError(parseApiError(payErr).message);
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
      showError(parseApiError(err).message);
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
            {hasPhysical
              ? 'Vérifiez vos informations de livraison avant de confirmer.'
              : 'Vérifiez votre commande avant de confirmer.'}
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
          {missingProfile.length > 0 && (
            <div className="chk-section chk-section--warning" role="alert">
              <span className="chk-section__tag">Profil</span>
              <h2>Complétez votre profil pour commander</h2>
              <p className="chk-section__text">
                Il manque : <strong>{missingProfile.join(', ')}</strong>. Ces informations servent à
                vous contacter et, pour un livre papier, à vous livrer.
              </p>
              <Link to="/profile" state={{ from: '/checkout' }} className="tn-btn tn-btn--primary chk-section__cta">
                <i className="fas fa-user-pen" /> Compléter mon profil
              </Link>
            </div>
          )}

          {hasPhysical ? (
            <div className="chk-section">
              <span className="chk-section__tag">Livraison</span>
              <h2>Informations de livraison</h2>

              <div className="chk-form-group">
                <label htmlFor="shipping_address">
                  Adresse complète <span className="required">*</span>
                </label>
                <textarea
                  id="shipping_address"
                  name="shipping_address"
                  value={formData.shipping_address}
                  onChange={handleChange}
                  placeholder="Quartier, rue, repère…"
                  autoComplete="street-address"
                  required
                  rows="3"
                />
              </div>

              <div className="chk-form-row">
                <div className="chk-form-group">
                  <label htmlFor="shipping_city">
                    Ville <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="shipping_city"
                    name="shipping_city"
                    value={formData.shipping_city}
                    onChange={handleChange}
                    placeholder="Ex. Port-Gentil"
                    autoComplete="address-level2"
                    required
                  />
                </div>

                <div className="chk-form-group">
                  <label htmlFor="shipping_phone">
                    Téléphone du destinataire <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="shipping_phone"
                    name="shipping_phone"
                    value={formData.shipping_phone}
                    onChange={handleChange}
                    placeholder="074 30 16 39"
                    inputMode="tel"
                    autoComplete="tel-national"
                    required
                  />
                </div>
              </div>

              <TnAlert variant="info" style={{ marginTop: 12 }}>
                Terre Noire Éditions livre les livres papier à Libreville, Port-Gentil et Lambaréné.
                Ailleurs au Gabon, la commande est à retirer dans l&apos;une de ces trois villes.
              </TnAlert>
            </div>
          ) : (
            <div className="chk-section">
              <span className="chk-section__tag">Ebook</span>
              <h2>Aucune livraison nécessaire</h2>
              <p className="chk-section__text">
                Votre commande ne contient que des ebooks{'\u00a0'}: ils seront disponibles dans
                «{'\u00a0'}Mes commandes{'\u00a0'}» et lisibles en ligne dès la confirmation du paiement.
              </p>
            </div>
          )}
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
                      {item.cover_image ? (
                        <img src={item.cover_image} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="chk-summary-item__cover"><TnBookCover book={item} variant="compact" /></span>
                      )}
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
                      {hasPhysical && (
                        <div className="chk-total-row">
                          <span>Livraison</span>
                          <span>{shipping === 0 ? <em style={{ color: 'var(--color-success)', fontStyle: 'normal' }}>Gratuite</em> : formatPrice(shipping)}</span>
                        </div>
                      )}
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
                {PAYMENT_METHODS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`chk-pay__option${paymentMethod === opt.value ? ' chk-pay__option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={opt.value}
                      className="chk-pay__radio"
                      checked={paymentMethod === opt.value}
                      onChange={() => { setPaymentMethod(opt.value); setMethodTouched(true); }}
                    />
                    <span className="chk-pay__indicator" />
                    <span className={`chk-pay__icon ${opt.iconClass}`}>
                      <i className={opt.icon} />
                    </span>
                    <span className="chk-pay__label">
                      <span className="chk-pay__name">
                        {opt.name}
                      </span>
                      <span className="chk-pay__desc">{opt.desc}</span>
                    </span>
                  </label>
                ))}
              </div>

              {needsPhone && (
                <div className="chk-pay__phone">
                  <label className="chk-pay__phone-label" htmlFor="phone_payment">
                    {isBambooPay ? 'Numéro de téléphone' : 'Numéro de téléphone (mobile money)'} <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone_payment"
                    className="chk-pay__phone-input"
                    placeholder="074 30 16 39"
                    inputMode="tel"
                    autoComplete="tel-national"
                    maxLength="20"
                    value={phoneForPayment}
                    onChange={(e) => setPhoneForPayment(formatPhoneTyping(e.target.value))}
                    aria-describedby="phone_payment_hint"
                  />
                  <p id="phone_payment_hint" className={`chk-pay__phone-hint${operatorMismatch || (phoneDigits.length >= 9 && phoneError) ? ' chk-pay__phone-hint--error' : ''}`}>
                    {operatorMismatch ? (
                      <>
                        Ce numéro est un numéro {OPERATOR_NAMES[detectedOperator]}.{' '}
                        <button type="button" className="chk-pay__switch" onClick={() => { setPaymentMethod(detectedOperator); setMethodTouched(true); }}>
                          Payer avec {OPERATOR_NAMES[detectedOperator]}
                        </button>
                      </>
                    ) : isPhoneValid
                      ? (isBambooPay
                        ? 'Vous serez redirigé vers BambooPay pour finaliser le paiement.'
                        : 'Vous recevrez une demande de validation sur ce numéro.')
                      : phoneDigits.length >= 9
                        ? phoneError
                        : isBambooPay
                          ? 'Numéro à 9 chiffres, par exemple 074 30 16 39.'
                          : 'Le numéro de votre compte Mobile Money, par exemple 074 30 16 39.'}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="chk-error" role="alert" ref={errorRef}>
                <i className="fas fa-exclamation-circle" aria-hidden="true" />
                <span>
                  {error}
                  {/profil/i.test(error) && (
                    <> <Link to="/profile" state={{ from: '/checkout' }}>Compléter mon profil</Link></>
                  )}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="chk-btn"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin" />{' '}
                  {needsPhone && !isBambooPay ? 'Envoi de la demande sur votre téléphone…' : 'Traitement en cours…'}
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
              {hasPhysical ? (
                <div className="chk-badge">
                  <i className="fas fa-truck" />
                  <span>Livraison à Libreville, Port-Gentil et Lambaréné</span>
                </div>
              ) : (
                <div className="chk-badge">
                  <i className="fas fa-book-open-reader" />
                  <span>Lecture en ligne immédiate</span>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;