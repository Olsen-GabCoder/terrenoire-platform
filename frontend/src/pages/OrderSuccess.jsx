import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import orderService from '../services/orderService';
import TnAlert from '../components/ui/TnAlert';
import { formatPhoneDisplay } from '../utils/phone';
import '../styles/OrderSuccess.css';
import PageHero from '../components/ui/PageHero';

const PAID_STATUSES = ['PAID', 'SHIPPED'];

const formatPrice = (price) => new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(price) + '\u00a0FCFA';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, orderData: stateOrder } = location.state || {};
  // Après un paiement Mobile Money, seule l'identifiant de commande est transmis :
  // on recharge la commande pour afficher les vrais montants (et non « 0 FCFA »).
  const [order, setOrder] = useState(stateOrder || null);
  const [downloading, setDownloading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  useEffect(() => {
    if (!orderId) {
      navigate('/catalog');
      return;
    }
    let cancelled = false;
    orderService.getOrderById(orderId)
      .then((data) => { if (!cancelled) setOrder(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [orderId, navigate]);

  if (!orderId) {
    return null;
  }

  const items = order?.items || [];
  const hasPhysical = items.some((i) => (i.format_purchased || 'PAPIER') === 'PAPIER');
  const ebookItems = items.filter((i) => i.format_purchased === 'EBOOK');
  const isPaid = PAID_STATUSES.includes(order?.status);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    setInvoiceError('');
    try {
      await orderService.downloadInvoice(orderId);
    } catch {
      setInvoiceError('La facture n\'a pas pu être téléchargée. Réessayez depuis « Mes commandes ».');
    } finally {
      setDownloading(false);
    }
  };

  const rows = [
    ['Commande', `#${orderId}`],
    order?.subtotal != null && ['Sous-total', formatPrice(order.subtotal)],
    hasPhysical && order?.shipping_cost != null && [
      'Livraison', Number(order.shipping_cost) === 0 ? 'Gratuite' : formatPrice(order.shipping_cost),
    ],
    Number(order?.discount_amount) > 0 && ['Réduction', `− ${formatPrice(order.discount_amount)}`],
    order?.total_amount != null && ['Montant total', formatPrice(order.total_amount), true],
    hasPhysical && order?.shipping_address && [
      'Livraison à', `${order.shipping_address}${order.shipping_city ? `, ${order.shipping_city}` : ''}`,
    ],
    hasPhysical && order?.shipping_phone && ['Téléphone', formatPhoneDisplay(order.shipping_phone)],
  ].filter(Boolean);

  return (
    <div className="os-page">
      <PageHero
        compact
        eyebrow={isPaid ? 'Paiement confirmé' : 'Commande enregistrée'}
        icon="fa-check"
        title="Merci pour votre"
        accent="commande"
        subtitle={isPaid
          ? <>Votre paiement est confirmé. Commande <strong>#{orderId}</strong>.</>
          : <>Votre commande <strong>#{orderId}</strong> est enregistrée.</>}
      />

      <div className="os-content">
        <div className="os-card">

        <div className="os-info">
          {rows.map(([label, value, strong]) => (
            <div className="os-info-row" key={label}>
              <span className="os-info-label">{label}</span>
              <span className={`os-info-value${strong ? ' os-info-value--total' : ''}`}>{value}</span>
            </div>
          ))}
        </div>

        {ebookItems.length > 0 && isPaid && (
          <TnAlert variant="success" style={{ marginBottom: 20 }}>
            <strong>{ebookItems.length > 1 ? 'Vos ebooks sont prêts.' : 'Votre ebook est prêt.'}</strong>{' '}
            Vous pouvez {ebookItems.length > 1 ? 'les' : 'le'} lire dès maintenant.
            <div style={{ marginTop: 10 }}>
              <Link
                to={ebookItems.length === 1 ? `/books/${ebookItems[0].book.id}/read` : '/orders'}
                className="os-btn os-btn--read"
              >
                <i className="fas fa-book-open-reader" /> {ebookItems.length > 1 ? 'Lire mes ebooks' : 'Lire mon ebook'}
              </Link>
            </div>
          </TnAlert>
        )}

        <div className="os-steps">
          <h2><i className="fas fa-list-check" /> Et maintenant ?</h2>
          <ol>
            <li>
              <strong>Confirmation par e-mail</strong> — le récapitulatif de votre commande vous est envoyé.
            </li>
            {hasPhysical ? (
              <>
                <li>
                  <strong>Préparation et livraison</strong> — à Libreville, Port-Gentil ou Lambaréné ;
                  ailleurs au Gabon, retrait dans l&apos;une de ces villes.
                </li>
                <li>
                  <strong>Suivi</strong> — l&apos;état de votre commande est visible dans « Mes commandes ».
                </li>
              </>
            ) : (
              <li>
                <strong>Lecture en ligne</strong> — vos ebooks restent disponibles à tout moment dans « Mes commandes ».
              </li>
            )}
          </ol>
        </div>

        <div className="os-actions">
          <Link to="/orders" className="os-btn os-btn--primary">
            <i className="fas fa-list" /> Voir mes commandes
          </Link>
          <Link to="/catalog" className="os-btn os-btn--outline">
            <i className="fas fa-book" /> Continuer mes découvertes
          </Link>
          {isPaid && (
            <button
              type="button"
              className="os-btn os-btn--outline"
              onClick={handleDownloadInvoice}
              disabled={downloading}
            >
              {downloading ? (
                <><i className="fas fa-spinner fa-spin" /> Téléchargement…</>
              ) : (
                <><i className="fas fa-file-invoice" /> Télécharger la facture</>
              )}
            </button>
          )}
        </div>
        {invoiceError && <p className="os-invoice-error" role="alert">{invoiceError}</p>}

        <div className="os-support">
          <p>
            <i className="fas fa-headset"></i>
            Une question ? Appelez-nous au{' '}
            <a href="tel:+24165348887">+241 65 34 88 87</a> ou écrivez-nous sur{' '}
            <a href="https://wa.me/24176593535" target="_blank" rel="noopener noreferrer">WhatsApp (+241 76 59 35 35)</a>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;