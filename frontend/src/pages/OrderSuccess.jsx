import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import orderService from '../services/orderService';
import TnAlert from '../components/ui/TnAlert';
import '../styles/OrderSuccess.css';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, orderData } = location.state || {};
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orderId) {
      navigate('/catalog');
    }
  }, [orderId, navigate]);

  if (!orderId) {
    return null;
  }

  const handleDownloadInvoice = async () => {
    if (!orderId) return;
    setDownloading(true);
    try {
      await orderService.downloadInvoice(orderId);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + ' FCFA';
  };

  return (
    <div className="os-page">
      <section className="os-hero">
        <div className="os-hero__orb" />
        <div className="os-hero__grid-bg" />
        <div className="os-hero__inner">
          <div className="os-hero__icon">
            <i className="fas fa-check-circle" />
          </div>
          <div className="os-hero__line" />
          <h1 className="os-hero__title">Votre commande a trouvé son chemin</h1>
          <p className="os-hero__sub">
            Merci pour votre confiance. Votre besace s&apos;apprête à recevoir ses compagnons — nous préparons votre commande <strong>#{orderId}</strong> avec soin.
          </p>
        </div>
      </section>
      <div className="os-hero-fade" />

      <div className="os-content">
        <div className="os-card">

        <p className="os-intro">Voici le détail de votre commande, conservé dans nos archives.</p>

        <div className="os-info">
          <div className="os-info-row">
            <span className="os-info-label">📦 Numéro de commande :</span>
            <span className="os-info-value">#{orderId}</span>
          </div>
          {orderData?.subtotal != null && (
            <div className="os-info-row">
              <span className="os-info-label">Sous-total :</span>
              <span className="os-info-value">{formatPrice(orderData.subtotal)}</span>
            </div>
          )}
          {orderData?.shipping_cost != null && (
            <div className="os-info-row">
              <span className="os-info-label">Livraison :</span>
              <span className="os-info-value">{Number(orderData.shipping_cost) === 0 ? 'Gratuit' : formatPrice(orderData.shipping_cost)}</span>
            </div>
          )}
          <div className="os-info-row">
            <span className="os-info-label">💰 Montant total :</span>
            <span className="os-info-value">{formatPrice(orderData?.total_amount || 0)}</span>
          </div>
          <div className="os-info-row">
            <span className="os-info-label">📍 Adresse de livraison :</span>
            <span className="os-info-value">{orderData?.shipping_address}</span>
          </div>
          <div className="os-info-row">
            <span className="os-info-label">📱 Téléphone :</span>
            <span className="os-info-value">{orderData?.shipping_phone}</span>
          </div>
          <div className="os-info-row">
            <span className="os-info-label">🏙️ Ville :</span>
            <span className="os-info-value">{orderData?.shipping_city}</span>
          </div>
        </div>

        {orderData?.items?.some((i) => (i.format_purchased || 'PAPIER') === 'PAPIER') && (
          <TnAlert variant="info" style={{ marginBottom: 20 }}>
            Terre Noire Editions livre les exemplaires physiques uniquement a Libreville, Port-Gentil et Lambarene. Si vous residez ailleurs, vous devrez venir recuperer votre commande dans l'une de ces trois villes.
          </TnAlert>
        )}

        {(() => {
          const ebookItems = (orderData?.items || []).filter((i) => i.format_purchased === 'EBOOK');
          if (ebookItems.length === 0) return null;
          return (
            <TnAlert variant="success" style={{ marginBottom: 20 }}>
              <strong>Vos ebooks sont prêts !</strong> Vous pouvez les lire dès maintenant.
              <div style={{ marginTop: 10 }}>
                {ebookItems.length === 1 ? (
                  <Link to={`/books/${ebookItems[0].book.id}/read`} className="os-btn os-btn--read">
                    <i className="fas fa-book-reader" /> Lire mon ebook
                  </Link>
                ) : (
                  <Link to="/orders" className="os-btn os-btn--read">
                    <i className="fas fa-book-reader" /> Lire mes ebooks
                  </Link>
                )}
              </div>
            </TnAlert>
          );
        })()}

        <div className="os-steps">
          <h2><i className="fas fa-list-check" /> Et maintenant ?</h2>
          <ol>
            <li>
              <strong>Nous préparons votre commande</strong> — votre paiement Mobile Money (Moov Money ou Airtel Money) est confirmé par e-mail
            </li>
            <li>
              <strong>Votre commande prend la route</strong> — une fois le paiement confirmé, nous expédions sous 5 à 10 jours ouvrés
            </li>
            <li>
              <strong>Vos livres rejoignent votre bibliothèque</strong> — livraison à l&apos;adresse indiquée
            </li>
          </ol>
        </div>

        <div className="os-payment">
          <h3><i className="fas fa-credit-card" /> Moyens de paiement acceptés</h3>
          <div className="os-payment-icons">
            <span><i className="fas fa-mobile-alt" /> Moov Money</span>
            <span><i className="fas fa-mobile-alt" /> Airtel Money</span>
          </div>
        </div>

        <blockquote className="os-quote">
          « Un livre offert ou choisi est un voyage qui commence. »
          <cite>— Terre Noire Éditions</cite>
        </blockquote>

        <div className="os-actions">
          <Link to="/catalog" className="os-btn os-btn--primary">
            <i className="fas fa-book" /> Découvrir d&apos;autres ouvrages
          </Link>
          <Link to="/orders" className="os-btn os-btn--primary">
            <i className="fas fa-list" /> Voir mes commandes
          </Link>
          <button
            type="button"
            className="os-btn os-btn--outline"
            onClick={handleDownloadInvoice}
            disabled={downloading}
          >
            {downloading ? (
              <><i className="fas fa-spinner fa-spin" /> Téléchargement…</>
            ) : (
              <><i className="fas fa-file-pdf" /> Télécharger la facture</>
            )}
          </button>
        </div>

        <div className="os-support">
          <p>
            <i className="fas fa-headset"></i>
            Une question ? Appelez notre service client au{' '}
            <a href="tel:+24165348887">+241 65 34 88 87</a> ou écrivez-nous sur{' '}
            <a href="https://wa.me/24176593535" target="_blank" rel="noopener noreferrer">WhatsApp (+241 76 59 35 35)</a>
          </p>
        </div>
        </div>
      </div>
      <div className="os-footer-fade" />
    </div>
  );
};

export default OrderSuccess;