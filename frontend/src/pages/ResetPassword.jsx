import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI, handleApiError } from '../services/api';
import TnInput from '../components/ui/TnInput';
import TnButton from '../components/ui/TnButton';
import TnAlert from '../components/ui/TnAlert';
import TnLink from '../components/ui/TnLink';
import '../styles/Login.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ new_password: '', confirm_password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!uid || !token) {
      setInvalidLink(true);
    }
  }, [uid, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (invalidLink || !uid || !token) return;
    if (formData.new_password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (formData.new_password !== formData.confirm_password) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await authAPI.resetPassword({
        uid,
        token,
        new_password: formData.new_password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || handleApiError(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (invalidLink) {
    return (
      <div className="login-page">
        <section className="login-hero">
          <div className="login-hero__orb login-hero__orb--1" />
          <div className="login-hero__grid-bg" />
          <div className="login-hero__inner">
            <h1 className="login-hero__title">
              <span className="login-hero__title-main">Lien invalide</span>
            </h1>
            <p className="login-hero__sub">
              Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.
            </p>
          </div>
        </section>
        <div className="login-hero-fade" />
        <div className="login-content">
          <div className="login-wrap">
            <div className="login-card">
              <TnLink to="/forgot-password" variant="strong" leftIcon={<i className="fas fa-redo" />}>
                Nouvelle demande
              </TnLink>
              <div className="login-footer">
                <TnLink to="/login" variant="strong">Retour à la connexion</TnLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="login-page">
        <section className="login-hero">
          <div className="login-hero__inner">
            <div className="login-hero__icon">
              <i className="fas fa-check-circle" style={{ color: 'var(--color-success)' }} />
            </div>
            <h1 className="login-hero__title">
              <span className="login-hero__title-main">Mot de passe réinitialisé</span>
            </h1>
            <p className="login-hero__sub">
              Vous allez être redirigé vers la page de connexion...
            </p>
          </div>
        </section>
        <div className="login-hero-fade" />
      </div>
    );
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="login-hero__orb login-hero__orb--1" />
        <div className="login-hero__orb login-hero__orb--2" />
        <div className="login-hero__grid-bg" />
        <div className="login-hero__inner">
          <span className="login-hero__pill">Nouveau mot de passe</span>
          <div className="login-hero__line" />
          <div className="login-hero__icon">
            <i className="fas fa-lock" />
          </div>
          <h1 className="login-hero__title">
            <span className="login-hero__title-main">Définir un nouveau mot de passe</span>
          </h1>
          <p className="login-hero__sub">
            Choisissez un mot de passe sécurisé (au moins 8 caractères).
          </p>
        </div>
      </section>

      <div className="login-hero-fade" />

      <div className="login-content">
        <div className="login-content__bg">
          <div className="login-content__orb login-content__orb--1" />
          <div className="login-content__orb login-content__orb--2" />
        </div>
        <div className="login-wrap">
          <div className="login-card">
            {error && (
              <TnAlert variant="error">{error}</TnAlert>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <TnInput
                label="Nouveau mot de passe"
                type="password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
                leftIcon={<i className="fas fa-lock" />}
                showToggle
              />

              <TnInput
                label="Confirmer le mot de passe"
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
                leftIcon={<i className="fas fa-lock" />}
                showToggle
              />

              <TnButton
                type="submit"
                variant="primary"
                block
                loading={isLoading}
                disabled={isLoading}
                leftIcon={<i className="fas fa-check" />}
              >
                {isLoading ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
              </TnButton>
            </form>

            <div className="login-footer">
              <TnLink to="/login" variant="strong" leftIcon={<i className="fas fa-arrow-left" />}>
                Retour à la connexion
              </TnLink>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ResetPassword;
