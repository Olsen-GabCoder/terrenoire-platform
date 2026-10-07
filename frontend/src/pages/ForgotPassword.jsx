import React, { useState } from 'react';
import { authAPI, handleApiError } from '../services/api';
import TnInput from '../components/ui/TnInput';
import TnButton from '../components/ui/TnButton';
import TnAlert from '../components/ui/TnAlert';
import TnLink from '../components/ui/TnLink';
import '../styles/Login.css';
import PageHero from '../components/ui/PageHero';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Indiquez votre adresse email.');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage(null);
    try {
      const res = await authAPI.forgotPassword(email.trim().toLowerCase());
      setMessage(res.data?.message || "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.");
    } catch (err) {
      const msg = err.response?.data?.message || handleApiError(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <PageHero
        compact
        eyebrow="Mot de passe oublié"
        title="Réinitialiser"
        accent="l'accès"
        subtitle="Saisissez votre email pour recevoir un lien de réinitialisation."
      />

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
                Récupération sécurisée
              </span>
            </div>
            {error && (
              <TnAlert variant="error">{error}</TnAlert>
            )}
            {message && (
              <TnAlert variant="success">{message}</TnAlert>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <TnInput
                label="Adresse email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="votre@email.com"
                required
                disabled={isLoading}
                leftIcon={<i className="fas fa-envelope" />}
              />

              <TnButton
                type="submit"
                variant="primary"
                block
                loading={isLoading}
                disabled={isLoading}
                leftIcon={<i className="fas fa-paper-plane" />}
              >
                {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </TnButton>
            </form>

            <div className="login-footer">
              <p>
                <TnLink to="/login" variant="strong" leftIcon={<i className="fas fa-arrow-left" />}>
                  Retour à la connexion
                </TnLink>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ForgotPassword;
