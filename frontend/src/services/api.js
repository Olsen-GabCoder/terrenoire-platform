import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- GESTION DES TOKENS (localStorage pour compatibilité cross-origin) ---
const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access, refresh) => {
    if (access) localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// --- INTERCEPTEURS ---

let isRefreshing = false;
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 2;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Request : ajouter le token Bearer + gérer FormData
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response : gérer le refresh token sur 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Server error 500+ → redirect to error page
    // Exception : les endpoints de paiement gerent leurs propres erreurs.
    // Une redirection forcee tuerait le polling et ferait croire au client
    // que son paiement a echoue alors que Bamboo peut encore confirmer.
    // Idem pour les requêtes qui modifient des données (création de commande...) :
    // l'utilisateur doit voir l'erreur sur place, pas être éjecté de la page.
    const requestUrl = error.config?.url || '';
    const isPaymentEndpoint = requestUrl.includes('/payments/');
    const isReadRequest = (error.config?.method || 'get').toLowerCase() === 'get';

    if (error.response?.status >= 500 && !isPaymentEndpoint && isReadRequest) {
      console.error('Server error:', error.response.status, error.config?.url);
      window.location.href = '/erreur-serveur';
      return new Promise(() => {}); // never resolves (page navigates away)
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      tokenStorage.clearTokens();
      refreshAttempts = 0;
      return Promise.reject(error);
    }

    // Protection contre la boucle infinie de refresh
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      tokenStorage.clearTokens();
      refreshAttempts = 0;
      processQueue(error, null);
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(originalRequest)).catch(() => Promise.reject(error));
    }

    originalRequest._retry = true;
    isRefreshing = true;
    refreshAttempts++;

    try {
      const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
        refresh: refreshToken,
      }, { withCredentials: true });

      const newAccess = response.data.access;
      const newRefresh = response.data.refresh || refreshToken;
      tokenStorage.setTokens(newAccess, newRefresh);
      refreshAttempts = 0;
      processQueue(null, newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      tokenStorage.clearTokens();
      refreshAttempts = 0;
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// --- API NEWSLETTER ---
export const newsletterAPI = {
  subscribe: (email) => api.post('/newsletter/subscribe/', { email }),
};

// --- API CONTACT ---
export const contactAPI = {
  submit: (data) => api.post('/contact/submit/', data),
};

// --- API CONFIG ---
export const configAPI = {
  getDeliveryConfig: () => api.get('/config/delivery/'),
  globalSearch: (query) => api.get('/config/search/', { params: { q: query } }),
};

// --- API COUPONS ---
export const couponAPI = {
  validate: (code) => api.post('/coupons/validate/', { code }),
};

// --- API WISHLIST ---
export const wishlistAPI = {
  getList: () => api.get('/wishlist/'),
  add: (bookId) => api.post('/wishlist/add/', { book_id: bookId }),
  toggle: (bookId) => api.post('/wishlist/toggle/', { book_id: bookId }),
  remove: (bookId) => api.delete(`/wishlist/${bookId}/`),
};

// --- API AUTHENTIFICATION ---
export const authAPI = {
  login: (credentials) => api.post('/token/', credentials),
  register: (userData) => api.post('/users/register/', userData),
  checkAuth: () => api.get('/users/check-auth/'),
  // Le refresh token est envoyé pour être révoqué côté serveur
  logout: () => api.post('/users/logout/', { refresh: tokenStorage.getRefreshToken() }),
  updateProfile: (data) => api.patch('/users/me/', data),
  changePassword: (data) => api.put('/users/me/change-password/', data),
  forgotPassword: (email) => api.post('/users/forgot-password/', { email }),
  resetPassword: (data) => api.post('/users/reset-password/', data),
};

// --- HELPER D'ERREUR ---

// Libellés lisibles des champs renvoyés par l'API (jamais de nom technique à l'écran)
const FIELD_LABELS = {
  username: "Nom d'utilisateur",
  email: 'E-mail',
  password: 'Mot de passe',
  password_confirm: 'Confirmation du mot de passe',
  old_password: 'Mot de passe actuel',
  new_password: 'Nouveau mot de passe',
  new_password_confirm: 'Confirmation du mot de passe',
  first_name: 'Prénom',
  last_name: 'Nom',
  phone_number: 'Téléphone',
  phone: 'Téléphone',
  address: 'Adresse',
  city: 'Ville',
  shipping_address: 'Adresse de livraison',
  shipping_city: 'Ville de livraison',
  shipping_phone: 'Téléphone de livraison',
  coupon_code: 'Code promo',
  items: 'Articles',
  quantity: 'Quantité',
  file: 'Fichier',
  title: 'Titre',
  description: 'Description',
  page_count: 'Nombre de pages',
  message: 'Message',
  subject: 'Sujet',
  name: 'Nom',
};

const flattenMessages = (val) => {
  if (val == null) return [];
  if (Array.isArray(val)) return val.flatMap(flattenMessages);
  if (typeof val === 'object') return Object.values(val).flatMap(flattenMessages);
  return [String(val)];
};

/**
 * Analyse une erreur axios/DRF.
 * Retourne { message, fieldErrors } : `message` est une phrase lisible,
 * `fieldErrors` associe chaque champ à son message (pour l'afficher sous le champ).
 */
export const parseApiError = (error) => {
  if (!error?.response) {
    if (error?.request) {
      return { message: 'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.', fieldErrors: {} };
    }
    return { message: error?.message || 'Une erreur inattendue est survenue.', fieldErrors: {} };
  }
  const { status, data } = error.response;
  if (status === 429) {
    return { message: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.', fieldErrors: {} };
  }
  if (status >= 500) {
    return { message: 'Le serveur rencontre un problème. Réessayez dans quelques instants.', fieldErrors: {} };
  }
  if (typeof data === 'string' || data == null) {
    return { message: status === 404 ? 'Élément introuvable.' : 'Une erreur est survenue.', fieldErrors: {} };
  }
  if (Array.isArray(data)) {
    return { message: flattenMessages(data).join(' '), fieldErrors: {} };
  }
  const fieldErrors = {};
  const general = [];
  for (const [key, val] of Object.entries(data)) {
    const msgs = flattenMessages(val);
    if (!msgs.length) continue;
    if (['detail', 'error', 'message', 'non_field_errors'].includes(key)) {
      general.push(...msgs);
    } else {
      fieldErrors[key] = msgs.join(' ');
    }
  }
  const fieldSummary = Object.entries(fieldErrors).map(
    ([key, msg]) => (FIELD_LABELS[key] ? `${FIELD_LABELS[key]} : ${msg}` : msg)
  );
  const message = [...general, ...fieldSummary].join(' ') || 'Une erreur est survenue.';
  return { message, fieldErrors };
};

/** Version texte (rétrocompatible) : une phrase lisible. */
export const handleApiError = (error) => parseApiError(error).message;

export default api;
