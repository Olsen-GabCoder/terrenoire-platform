import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TnInput from '../components/ui/TnInput';
import TnButton from '../components/ui/TnButton';
import TnAlert from '../components/ui/TnAlert';
import TnLink from '../components/ui/TnLink';

// Les appelants passent `from` soit en chaîne ('/checkout'), soit en objet location.
const getRedirectTarget = (state) => {
  const from = state?.from;
  const target = typeof from === 'string' ? from : from?.pathname && `${from.pathname}${from.search || ''}`;
  // N'accepter que des chemins internes
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
};
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  // États
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirection si déjà connecté
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // Rediriger vers la page d'où on vient, ou l'accueil par défaut
      const from = getRedirectTarget(location.state);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  // Gestion des champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(''); // Effacer l'erreur quand l'utilisateur tape
  };

  // Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError("Tous les champs sont nécessaires.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Appel au contexte d'authentification
      // Note: On passe 'email' comme premier argument car notre backend
      // custom (EmailTokenObtainPairView) gère la détection email/username
      const result = await login(formData.email, formData.password);

      if (result.success) {
        const from = getRedirectTarget(location.state);
        navigate(from, { replace: true });
      } else {
        // 401 = identifiants refusés ; sinon (réseau, trop de tentatives…) message précis
        if (result.status === 401) {
          setError("E-mail (ou nom d'utilisateur) ou mot de passe incorrect.");
        } else {
          setError(result.error || 'La connexion a échoué. Réessayez.');
        }
      }
    } catch (err) {
      console.error("Erreur Login Page:", err);
      setError('Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── HERO ── */}
      <section className="login-hero">
        <div className="login-hero__orb login-hero__orb--1" />
        <div className="login-hero__orb login-hero__orb--2" />
        <div className="login-hero__orb login-hero__orb--3" />
        <div className="login-hero__grid-bg" />
        <div className="login-hero__shine" />

        <div className="login-hero__inner">
          <span className="login-hero__pill">Bienvenue</span>
          <div className="login-hero__line" />
          <div className="login-hero__icon">
            <i className="fas fa-key" />
          </div>
          <h1 className="login-hero__title">
            <span className="login-hero__title-main">Retrouver ma bibliothèque</span>
          </h1>
          <p className="login-hero__sub">
            Accédez à votre espace pour gérer vos commandes, suivre vos manuscrits
            et retrouver votre bibliothèque.
          </p>
        </div>
      </section>

      <div className="login-hero-fade" />

      {/* ── CONTENU ── */}
      <div className="login-content">
        <div className="login-content__bg">
          <div className="login-content__orb login-content__orb--1" />
          <div className="login-content__orb login-content__orb--2" />
        </div>

        <div className="login-wrap">
          <div className="login-card">
            <div className="login-card__header">
              <span className="login-card__trust">
                <i className="fas fa-shield-halved" />
                Connexion sécurisée
              </span>
            </div>
            {error && (
              <TnAlert variant="error">{error}</TnAlert>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <TnInput
                label="Email ou Nom d'utilisateur"
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                required
                disabled={isLoading}
                leftIcon={<i className="fas fa-envelope" />}
              />

              <TnInput
                label="Mot de passe"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={isLoading}
                leftIcon={<i className="fas fa-lock" />}
                showToggle
              />

              <div className="login-options">
                <TnLink to="/forgot-password" variant="strong" leftIcon={<i className="fas fa-question-circle" />}>
                  Mot de passe oublié ?
                </TnLink>
              </div>

              <TnButton
                type="submit"
                variant="primary"
                block
                loading={isLoading}
                disabled={isLoading}
                leftIcon={<i className="fas fa-sign-in-alt" />}
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </TnButton>
            </form>

            <div className="login-footer">
              <p>
                Pas encore de compte ?{' '}
                <TnLink to="/register" variant="strong">
                  S'inscrire
                </TnLink>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;