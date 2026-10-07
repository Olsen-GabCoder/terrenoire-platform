import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDeliveryConfig } from '../context/DeliveryConfigContext';
import { couponAPI } from '../services/api';
import TnAlert from '../components/ui/TnAlert';
import { TnBookCover } from '../components/ui';
import '../styles/Cart.css';
import PageHero from '../components/ui/PageHero';
import EmptyState from '../components/ui/EmptyState';

const Cart = () => {
  const { shippingFreeThreshold, shippingCost } = useDeliveryConfig();
  const {
    cartItems,
    appliedCoupon,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyCouponToContext,
    clearCoupon,
    getTotalPrice,
    getTotalItems
  } = useCart();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState(null);
  const [applying, setApplying] = useState(false);

  const fmt = (p) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(p) + ' FCFA';

  const subtotal = cartItems.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  const hasPhysicalBook = cartItems.some((i) => i.format_purchased === 'PAPIER');
  const shipping = subtotal === 0 || !hasPhysicalBook ? 0 : subtotal >= shippingFreeThreshold ? 0 : shippingCost;
  const discountPercent = appliedCoupon?.discountPercent ?? 0;
  const discountFixed = appliedCoupon?.discountAmount ?? 0;
  const discountAmt = discountPercent > 0
    ? (subtotal * discountPercent) / 100
    : Math.min(discountFixed, subtotal);
  const total = subtotal - discountAmt + shipping;

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMsg({ ok: false, text: 'Saisissez un code promo' });
      return;
    }
    setApplying(true);
    setCouponMsg(null);
    try {
      const res = await couponAPI.validate(code);
      const data = res.data;
      if (data.valid) {
        applyCouponToContext({
          code: code,
          discountPercent: data.discount_percent ?? 0,
          discountAmount: data.discount_amount ?? 0,
        });
        setCouponMsg({ ok: true, text: data.message });
      } else {
        clearCoupon();
        setCouponMsg({ ok: false, text: data.message || "Ce code promo n'est pas valide" });
      }
    } catch (err) {
      clearCoupon();
      const msg = err.response?.data?.message || "Ce code promo n'est pas valide";
      setCouponMsg({ ok: false, text: msg });
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    clearCoupon();
    setCouponCode('');
    setCouponMsg(null);
  };

  const checkout = () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: '/cart' } }); return; }
    if (!cartItems.length) return;
    navigate('/checkout');
  };

  const handleClearCart = () => {
    if (window.confirm('Vider le panier ? Tous les articles seront retirés.')) clearCart();
  };

  /* ── PANIER VIDE ── */
  if (!cartItems.length) {
    return (
      <div className="crt-page">
        <PageHero compact title="Mon" accent="panier" subtitle="Votre panier est vide pour le moment." />

        <div className="crt-content">
          <div className="crt-empty">
            <EmptyState
              icon="fa-bag-shopping"
              title="Votre besace attend ses compagnons"
              text="Parcourez notre catalogue pour découvrir des œuvres qui sauront vous accompagner."
            >
              <Link to="/catalog" className="tn-btn tn-btn--primary tn-btn--lg">
                <i className="fas fa-book-open" /> Explorer le catalogue
              </Link>
            </EmptyState>
            <div className="crt-empty__features">
              {[
                { ico: 'fas fa-truck', t: 'Livraison', d: 'Libreville, Port-Gentil, Lambaréné' },
                { ico: 'fas fa-mobile-alt', t: 'Paiement', d: 'Moov Money, Airtel Money, BambooPay' },
                { ico: 'fas fa-lock', t: 'Paiement sécurisé', d: 'Transactions protégées' },
              ].map((f) => (
                <div className="crt-feat" key={f.t}>
                  <div className="crt-feat__ico"><i className={f.ico} /></div>
                  <strong>{f.t}</strong>
                  <span>{f.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── PANIER REMPLI ── */
  return (
    <div className="crt-page">
      <PageHero
        compact
        title="Mon"
        accent="panier"
        subtitle={`${getTotalItems()} article${getTotalItems() > 1 ? 's' : ''} dans votre panier`}
      />

      <div className="crt-content">
        <div className="crt-layout">

          {/* ── COLONNE ARTICLES ── */}
          <div className="crt-items">
            <div className="crt-items__head">
              <h2>Articles</h2>
              <button type="button" onClick={handleClearCart} className="crt-clear">
                <i className="fas fa-trash-alt" /> Vider
              </button>
            </div>

            {cartItems.map((item) => (
              <div className="crt-card" key={`${item.id}_${item.format_purchased}`}>
                <Link to={`/books/${item.id}`} className="crt-card__img" aria-label={item.title}>
                  {item.cover_image ? (
                    <img src={item.cover_image} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <TnBookCover book={item} variant="compact" />
                  )}
                </Link>
                <div className="crt-card__body">
                  <div className="crt-card__top">
                    <h3 className="crt-card__title">
                      <Link to={`/books/${item.id}`}>{item.title}</Link>
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id, item.format_purchased)}
                      className="crt-card__rm"
                      aria-label={`Retirer « ${item.title} » du panier`}
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                  <p className="crt-card__author">
                    {item.author?.full_name || 'Auteur inconnu'}
                  </p>
                  <span className="crt-card__format">
                    {item.format_purchased === 'EBOOK' ? 'Ebook' : 'Papier'}
                  </span>
                  <div className="crt-card__bottom">
                    {item.format_purchased === 'EBOOK' ? (
                      <span className="crt-card__single">Exemplaire numérique</span>
                    ) : (
                      <div className="crt-qty">
                        <button
                          type="button"
                          aria-label="Diminuer la quantité"
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.format_purchased)}
                          disabled={item.quantity <= 1}
                        >−</button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Augmenter la quantité"
                          onClick={() => updateQuantity(item.id, Math.min(99, item.quantity + 1), item.format_purchased)}
                          disabled={item.quantity >= 99}
                        >+</button>
                      </div>
                    )}
                    <div className="crt-card__price">
                      {item.original_price && Number(item.original_price) > Number(item.price) && (
                        <span className="crt-card__old-price">{fmt(item.original_price)}</span>
                      )}
                      {item.quantity > 1 && <span className="crt-card__unit">{fmt(item.price)} × {item.quantity}</span>}
                      <strong>{fmt(item.price * item.quantity)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── COLONNE RÉSUMÉ ── */}
          <div className="crt-summary">
            <div className="crt-sum-card">
              <h2>Récapitulatif</h2>

              {/* Coupon */}
              <div className="crt-coupon">
                <label htmlFor="crt-coupon-input">Code promo</label>
                <div className="crt-coupon__row">
                  <input
                    id="crt-coupon-input"
                    type="text"
                    placeholder="Ex: MAISON10"
                    value={appliedCoupon?.code ?? couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                    readOnly={!!appliedCoupon}
                  />
                  <button type="button" onClick={applyCoupon} disabled={applying || !couponCode.trim() || !!appliedCoupon}>
                    {applying ? '…' : 'Appliquer'}
                  </button>
                </div>
                {couponMsg && (
                  <p className={`crt-coupon__msg ${couponMsg.ok ? 'ok' : 'err'}`}>
                    <i className={`fas fa-${couponMsg.ok ? 'check' : 'times'}-circle`} />
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {hasPhysicalBook && (
                <TnAlert variant="info" style={{ marginBottom: 16 }}>
                  Livraison des livres papier à Libreville, Port-Gentil et Lambaréné. Ailleurs au Gabon,
                  la commande est à retirer dans l&apos;une de ces trois villes.
                </TnAlert>
              )}

              {!hasPhysicalBook && cartItems.length > 0 && (
                <TnAlert variant="info" style={{ marginBottom: 16 }}>
                  Pas de livraison pour un ebook : il sera lisible en ligne dans « Mes commandes » dès la confirmation du paiement.
                </TnAlert>
              )}

              {/* Prix */}
              <div className="crt-prices">
                <div className="crt-row">
                  <span>Sous-total</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="crt-row crt-row--discount">
                    <span>
                      Réduction {appliedCoupon?.code && `(${appliedCoupon.code})`}
                      {discountPercent > 0 ? ` (${discountPercent}%)` : ''}
                      <button type="button" onClick={removeCoupon} className="crt-coupon-remove" aria-label="Retirer le code">×</button>
                    </span>
                    <span>-{fmt(discountAmt)}</span>
                  </div>
                )}
                {hasPhysicalBook && (
                  <div className="crt-row">
                    <span>Livraison</span>
                    <span>{shipping === 0 ? <em className="crt-free">Gratuite</em> : fmt(shipping)}</span>
                  </div>
                )}
                {shipping > 0 && subtotal < shippingFreeThreshold && (
                  <div className="crt-progress-notice">
                    <p>Plus que {fmt(shippingFreeThreshold - subtotal)} pour la livraison gratuite</p>
                    <div className="crt-progress">
                      <div style={{ width: `${(subtotal / shippingFreeThreshold) * 100}%` }} />
                    </div>
                  </div>
                )}
                <div className="crt-row crt-row--total">
                  <span>Total</span>
                  <strong>{fmt(total)}</strong>
                </div>
              </div>

              {/* Actions */}
              <div className="crt-actions">
                <button type="button" onClick={checkout} className="crt-btn crt-btn--primary crt-btn--full">
                  Passer la commande
                </button>
                <button type="button" onClick={() => navigate('/catalog')} className="crt-btn crt-btn--outline crt-btn--full">
                  Continuer mes achats
                </button>
              </div>

              {/* Garanties */}
              <div className="crt-guarantees">
                {[
                  { ico: 'fas fa-lock', t: 'Paiement sécurisé' },
                  { ico: 'fas fa-mobile-alt', t: 'Moov Money, Airtel Money, BambooPay' },
                  hasPhysicalBook
                    ? { ico: 'fas fa-truck', t: 'Livraison à Libreville, Port-Gentil, Lambaréné' }
                    : { ico: 'fas fa-book-open-reader', t: 'Lecture en ligne immédiate' },
                ].map((g) => (
                  <div className="crt-guar" key={g.t}>
                    <i className={g.ico} /> {g.t}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Cart;
