import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { DeliveryConfigProvider } from './context/DeliveryConfigContext';
import Header from './components/Header';
import Footer from './components/Footer';
import SeparatorDefs from './components/SeparatorDefs';
import RouteSuspenseFallback from './components/RouteSuspenseFallback';
import SectionSeparator from './components/SectionSeparator';
import ErrorBoundary from './components/ErrorBoundary';

// Eager routes (critical path — always in initial bundle)
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Lazy routes (loaded on demand)
const Catalog = lazy(() => import('./pages/Catalog'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const BookReader = lazy(() => import('./pages/BookReader'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CheckoutPayment = lazy(() => import('./pages/CheckoutPayment'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const SubmitManuscript = lazy(() => import('./pages/SubmitManuscript'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Authors = lazy(() => import('./pages/Authors'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Delivery = lazy(() => import('./pages/Delivery'));
const Privacy = lazy(() => import('./pages/Privacy'));
const CGV = lazy(() => import('./pages/CGV'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Support = lazy(() => import('./pages/Support'));
const Terms = lazy(() => import('./pages/Terms'));
const Cookies = lazy(() => import('./pages/Cookies'));
const Settings = lazy(() => import('./pages/Settings'));
const ServerError = lazy(() => import('./pages/ServerError'));
const AuthorDetail = lazy(() => import('./pages/AuthorDetail'));
const CollectionDetail = lazy(() => import('./pages/CollectionDetail'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Orders = lazy(() => import('./pages/Orders'));
const NewsletterConfirm = lazy(() => import('./pages/NewsletterConfirm'));
const NewsletterUnsubscribe = lazy(() => import('./pages/NewsletterUnsubscribe'));

// Lazy admin routes
import AdminLayout from './components/admin/AdminLayout';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
const AdminBooks = lazy(() => import('./pages/admin/AdminBooks'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminManuscripts = lazy(() => import('./pages/admin/AdminManuscripts'));
const AdminAuthors = lazy(() => import('./pages/admin/AdminAuthors'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminNewsletter = lazy(() => import('./pages/admin/AdminNewsletter'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminContact = lazy(() => import('./pages/admin/AdminContact'));
const AdminCollections = lazy(() => import('./pages/admin/AdminCollections'));
const AdminConfig = lazy(() => import('./pages/admin/AdminConfig'));

// Dev-only routes (tree-shaken in production)
const ButtonShowcase = import.meta.env.DEV ? lazy(() => import('./pages/_dev/ButtonShowcase')) : null;
const InputShowcase = import.meta.env.DEV ? lazy(() => import('./pages/_dev/InputShowcase')) : null;
const BadgeShowcase = import.meta.env.DEV ? lazy(() => import('./pages/_dev/BadgeShowcase')) : null;
const AtomicsShowcase = import.meta.env.DEV ? lazy(() => import('./pages/_dev/AtomicsShowcase')) : null;

import BottomNav from './components/BottomNav';
import { ToastProvider } from './components/ui/ToastProvider';
import './App.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  const location = useLocation();
  const hidden = location.pathname.startsWith('/admin') || location.pathname.match(/\/read$/);

  useEffect(() => {
    if (hidden) return;
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [hidden, location.pathname]);

  if (hidden || progress === 0) return null;

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress__bar" style={{ width: `${progress}%` }} />
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin-dashboard');
  const isFullWidthPage = ['/profile', '/contact', '/about', '/delivery', '/privacy', '/cgv', '/faq', '/support', '/terms', '/cookies', '/settings', '/submit-manuscript', '/wishlist', '/orders', '/checkout', '/order-success', '/cart', '/forgot-password', '/reset-password'].includes(location.pathname) || location.pathname.startsWith('/books/') || location.pathname.startsWith('/authors/') || location.pathname.startsWith('/collections/') || location.pathname.startsWith('/newsletter/') || location.pathname.startsWith('/checkout/paiement/');
  const isReaderPage = location.pathname.match(/^\/books\/[^/]+\/(read|excerpt-read)$/);

  return (
    <div className="app">
      <SeparatorDefs />
      <ScrollToTop />
      <ScrollProgressBar />
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      {!isReaderPage && !isAdminRoute && <Header />}
      <main id="main-content" role="main" className={`main-content ${isAdminRoute ? 'main-content--admin' : ''} ${isFullWidthPage ? 'main-content--full' : ''} ${isReaderPage ? 'main-content--reader' : ''}`}>
        <ErrorBoundary>
        <Suspense fallback={<RouteSuspenseFallback />}>
          <div key={location.pathname} className={location.pathname.startsWith('/admin') || location.pathname.match(/\/(read|excerpt-read)$/) || location.pathname.startsWith('/checkout') ? '' : 'tn-page-transition'}>
              <Routes>
                {/* Routes principales */}
                <Route path="/" element={<Home />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/books/:id" element={<BookDetail />} />
                <Route path="/books/:id/read" element={<BookReader />} />
                <Route path="/books/:id/excerpt-read" element={<BookReader />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/checkout/paiement/:bambooRef" element={<CheckoutPayment />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/submit-manuscript" element={<SubmitManuscript />} />
                
                {/* Routes utilisateur */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/newsletter/confirm/:status" element={<NewsletterConfirm />} />
                <Route path="/newsletter/unsubscribe/:status" element={<NewsletterUnsubscribe />} />
                
                {/* Routes Admin — protégées, layout sidebar */}
                <Route path="/admin-dashboard" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="books" element={<AdminBooks />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="manuscripts" element={<AdminManuscripts />} />
                  <Route path="authors" element={<AdminAuthors />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="newsletter" element={<AdminNewsletter />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="collections" element={<AdminCollections />} />
                  <Route path="contact" element={<AdminContact />} />
                  <Route path="config" element={<AdminConfig />} />
                </Route>
                
                {/* Routes informatives */}
                <Route path="/authors" element={<Authors />} />
                <Route path="/authors/:id" element={<AuthorDetail />} />
                <Route path="/collections/:slug" element={<CollectionDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/delivery" element={<Delivery />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/cgv" element={<CGV />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/support" element={<Support />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                
                {/* Dev-only routes */}
                {ButtonShowcase && <Route path="/dev/buttons" element={<ButtonShowcase />} />}
                {InputShowcase && <Route path="/dev/inputs" element={<InputShowcase />} />}
                {BadgeShowcase && <Route path="/dev/badges" element={<BadgeShowcase />} />}
                {AtomicsShowcase && <Route path="/dev/atomics-2-5" element={<AtomicsShowcase />} />}

                {/* Redirections et 404 */}
                <Route path="/catalogue" element={<Navigate to="/catalog" replace />} />
                <Route path="/livres" element={<Navigate to="/catalog" replace />} />
                <Route path="/erreur-serveur" element={<ServerError />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
          </div>
        </Suspense>
        </ErrorBoundary>
      </main>
      {!isAdminRoute && !isReaderPage && <SectionSeparator direction="cream-to-dark" variant={1} />}
      {/* Pendant la commande et le paiement : pied de page réduit, sans distraction */}
      {!isAdminRoute && !isReaderPage && <Footer minimal={location.pathname.startsWith('/checkout')} />}
      {!isAdminRoute && !isReaderPage && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <DeliveryConfigProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </DeliveryConfigProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;