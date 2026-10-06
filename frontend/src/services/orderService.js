// frontend/src/services/orderService.js
import api from './api';

const orderService = {
  // ============ ORDERS ============
  
  // Créer une commande depuis le panier
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/orders/', orderData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      throw error;
    }
  },

  // Récupérer l'historique des commandes de l'utilisateur
  getOrders: async (params = {}) => {
    try {
      const response = await api.get('/orders/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      throw error;
    }
  },

  // Récupérer une commande par ID
  getOrderById: async (id) => {
    try {
      const response = await api.get(`/orders/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la commande ${id}:`, error);
      throw error;
    }
  },

  // Annuler une commande
  cancelOrder: async (id) => {
    try {
      const response = await api.post(`/orders/${id}/cancel/`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'annulation de la commande ${id}:`, error);
      throw error;
    }
  },

  // Télécharger la facture PDF
  downloadInvoice: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/invoice/`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facture-commande-${String(orderId).padStart(6, '0')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ============ PAYMENTS ============

  // Créer un paiement pour une commande (legacy)
  createPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments/', paymentData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error);
      throw error;
    }
  },

  // Récupérer un paiement par ID
  getPaymentById: async (id) => {
    try {
      const response = await api.get(`/payments/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du paiement ${id}:`, error);
      throw error;
    }
  },

  // ============ BAMBOO PAY ============

  /**
   * Initie un paiement mobile money via Bamboo Pay.
   * @param {number} orderId
   * @param {'moov_money'|'airtel_money'} operator
   * @param {string} phone - Numéro gabonais (8 chiffres)
   * @returns {Promise<{bamboo_ref: string, merchant_ref: string, status: string, message: string}>}
   */
  initiatePayment: async (orderId, operator, phone) => {
    const response = await api.post('/payments/initiate/', {
      order_id: orderId,
      operator,
      phone,
    }, {
      // L'envoi de la demande USSD par Bamboo peut prendre jusqu'à ~30 s :
      // le délai par défaut (15 s) faisait croire à un échec alors que la demande partait.
      timeout: 45000,
    });
    return response.data;
  },

  /**
   * Vérifie le statut d'un paiement Bamboo Pay.
   * @param {string} bambooRef - Référence Bamboo (TXN-...)
   * @returns {Promise<{bamboo_ref: string, status: string, finalized_at?: string, message?: string}>}
   */
  checkPaymentStatus: async (bambooRef) => {
    const response = await api.post(`/payments/check-status/${bambooRef}/`);
    return response.data;
  },
};

export default orderService;