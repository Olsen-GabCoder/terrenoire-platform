import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TnInput from '../components/ui/TnInput';
import TnPhoneInput from '../components/ui/TnPhoneInput';
import { validatePhone, phoneForApi } from '../utils/phone';
import TnButton from '../components/ui/TnButton';
import TnAlert from '../components/ui/TnAlert';
import TnLink from '../components/ui/TnLink';
import TnCheckbox from '../components/ui/TnCheckbox';
import '../styles/Register.css';
import PageHero from '../components/ui/PageHero';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isAuthenticated, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.username.trim()) {
      errors.username = "Le nom d'utilisateur est requis";
    } else if (formData.username.length < 3) {
      errors.username = 'Minimum 3 caractères';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Lettres, chiffres et underscore seulement';
    }

    if (!formData.email.trim()) {
      errors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email invalide';
    }

    if (!formData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      errors.password = 'Minimum 8 caractères';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirmez le mot de passe';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!formData.first_name.trim()) {
      errors.first_name = 'Le prénom est requis';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Le nom est requis';
    }

    const phoneError = validatePhone(formData.phone_number, { allowForeign: true });
    if (phoneError) {
      errors.phone_number = phoneError;
    }

    if (!termsAccepted) {
      errors.terms = 'Vous devez accepter les conditions';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const registrationData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        password_confirm: formData.confirmPassword,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: phoneForApi(formData.phone_number),
      };

      const result = await register(registrationData);

      if (result.success) {
        navigate('/', {
          replace: true,
          state: { message: 'Inscription réussie ! Bienvenue.' },
        });
      } else {
        const apiFieldErrors = result.fieldErrors || {};
        if (apiFieldErrors.password_confirm) apiFieldErrors.confirmPassword = apiFieldErrors.password_confirm;
        setFieldErrors(apiFieldErrors);
        setError(
          Object.keys(apiFieldErrors).length
            ? 'Certaines informations sont à corriger : voir les champs indiqués ci-dessous.'
            : result.error || "L'inscription n'a pas abouti. Réessayez."
        );
      }
    } catch (err) {
      console.error('Erreur inscription:', err);
      setError('Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reg-page">
      {/* ── HERO ── */}
      <PageHero
        compact
        eyebrow="Rejoignez-nous"
        title="Rejoindre la"
        accent="communauté"
        subtitle="Commandez en toute simplicité, soumettez vos manuscrits et retrouvez vos ebooks dans votre espace."
      />

      {/* ── CONTENU ── */}
      <div className="reg-content">
        <div className="reg-content__bg">
          <div className="reg-content__orb reg-content__orb--1" />
          <div className="reg-content__orb reg-content__orb--2" />
        </div>

        <div className="reg-wrap">
          <div className="reg-card">
            <div className="reg-card__header">
              <span className="reg-card__trust">
                <i className="fas fa-shield-halved" />
                Inscription sécurisée
              </span>
            </div>

            {error && (
              <TnAlert variant="error">{error}</TnAlert>
            )}

            {location.state?.message && (
              <TnAlert variant="success">{location.state.message}</TnAlert>
            )}

            <form onSubmit={handleSubmit} className="reg-form">
              <div className="reg-row">
                <TnInput
                  label="Nom d'utilisateur"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="johndoe"
                  autoComplete="username"
                  required
                  disabled={isLoading}
                  leftIcon={<i className="fas fa-user" />}
                  error={fieldErrors.username}
                />
                <TnInput
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="exemple@email.com"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  leftIcon={<i className="fas fa-envelope" />}
                  error={fieldErrors.email}
                />
              </div>

              <div className="reg-row">
                <TnInput
                  label="Prénom"
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Jean"
                  autoComplete="given-name"
                  required
                  disabled={isLoading}
                  leftIcon={<i className="fas fa-user" />}
                  error={fieldErrors.first_name}
                />
                <TnInput
                  label="Nom"
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Dupont"
                  autoComplete="family-name"
                  required
                  disabled={isLoading}
                  leftIcon={<i className="fas fa-user" />}
                  error={fieldErrors.last_name}
                />
              </div>

              <TnPhoneInput
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                disabled={isLoading}
                helper="Optionnel — nécessaire pour commander"
                error={fieldErrors.phone_number}
              />

              <TnInput
                label="Mot de passe"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={isLoading}
                leftIcon={<i className="fas fa-lock" />}
                showToggle
                error={fieldErrors.password}
              />

              <TnInput
                label="Confirmer le mot de passe"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={isLoading}
                leftIcon={<i className="fas fa-lock" />}
                showToggle
                error={fieldErrors.confirmPassword}
              />
              {formData.password && formData.confirmPassword && (
                <span className={`reg-match ${formData.password === formData.confirmPassword ? 'ok' : 'err'}`}>
                  <i className={`fas fa-${formData.password === formData.confirmPassword ? 'check-circle' : 'times-circle'}`} />
                  {formData.password === formData.confirmPassword ? 'Correspond' : 'Ne correspond pas'}
                </span>
              )}

              <TnCheckbox
                checked={termsAccepted}
                onChange={setTermsAccepted}
                required
                disabled={isLoading}
                error={fieldErrors.terms}
                label={<>
                  J'accepte les{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ds-orange)' }}>conditions</a>
                  {' '}et la{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ds-orange)' }}>politique de confidentialité</a>
                </>}
              />

              <TnButton
                type="submit"
                variant="primary"
                block
                loading={isLoading}
                disabled={isLoading || !termsAccepted}
                leftIcon={<i className="fas fa-user-plus" />}
              >
                {isLoading ? 'Inscription...' : 'Créer mon compte'}
              </TnButton>
            </form>

            <div className="reg-footer">
              <p>
                Vous avez déjà un compte ?{' '}
                <TnLink to="/login" variant="strong">Se connecter</TnLink>
              </p>
              <TnLink to="/" leftIcon={<i className="fas fa-arrow-left" />}>
                Retour à l'accueil
              </TnLink>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Register;
