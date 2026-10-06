import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TnInput from '../components/ui/TnInput';
import '../styles/Settings.css';

const EMPTY_PASSWORDS = { old_password: '', new_password: '', new_password_confirm: '' };

const Settings = () => {
  const { user, authChecked, updateProfile, changePassword } = useAuth();
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [pwErrors, setPwErrors] = useState({});
  const [pwMessage, setPwMessage] = useState({ type: '', text: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const navigate = useNavigate();
  const [receiveNewsletter, setReceiveNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      navigate('/login', { state: { from: '/settings' } });
      return;
    }
    setReceiveNewsletter(user.receive_newsletter || false);
  }, [authChecked, user, navigate]);

  const handleNewsletterChange = async (e) => {
    const checked = e.target.checked;
    setReceiveNewsletter(checked);
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await updateProfile({ receive_newsletter: checked });
      if (result.success) {
        setMessage({ type: 'success', text: checked ? 'Newsletter activée.' : 'Newsletter désactivée.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de la mise à jour.' });
        setReceiveNewsletter(!checked);
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion.' });
      setReceiveNewsletter(!checked);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswords((p) => ({ ...p, [name]: value }));
    if (pwErrors[name]) setPwErrors((p) => ({ ...p, [name]: '' }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwMessage({ type: '', text: '' });
    const errors = {};
    if (!passwords.old_password) errors.old_password = 'Saisissez votre mot de passe actuel.';
    if (passwords.new_password.length < 8) errors.new_password = '8 caractères minimum.';
    if (passwords.new_password !== passwords.new_password_confirm) {
      errors.new_password_confirm = 'Les deux mots de passe ne correspondent pas.';
    }
    setPwErrors(errors);
    if (Object.keys(errors).length) return;

    setPwLoading(true);
    const result = await changePassword(passwords);
    setPwLoading(false);
    if (result.success) {
      setPasswords(EMPTY_PASSWORDS);
      setPwMessage({ type: 'success', text: 'Mot de passe modifié. Un e-mail de confirmation vous a été envoyé.' });
    } else {
      setPwErrors(result.fieldErrors || {});
      setPwMessage({ type: 'error', text: result.error || 'La modification a échoué.' });
    }
  };

  if (!user) return null;

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div className="settings-hero__orb settings-hero__orb--1" />
        <div className="settings-hero__grid-bg" />
        <div className="settings-hero__inner">
          <div className="settings-hero__line" />
          <h1 className="settings-hero__title">Paramètres</h1>
          <p className="settings-hero__sub">
            Gérez vos préférences et les notifications de votre compte.
          </p>
        </div>
      </section>

      <div className="settings-hero-fade" />

      <div className="settings-content">
        <div className="settings-card">
          <h2><i className="fas fa-bell" /> Notifications</h2>
          <div className="settings-row">
            <div className="settings-row__label">
              <span>Newsletter</span>
              <small>Recevez nos nouveautés et actualités par email</small>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                aria-label="Recevoir la newsletter"
                checked={receiveNewsletter}
                onChange={handleNewsletterChange}
                disabled={loading}
              />
              <span className="settings-toggle__slider" />
            </label>
          </div>
          {message.text && (
            <p className={`settings-msg settings-msg--${message.type}`} role="status">
              <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
              {message.text}
            </p>
          )}
        </div>

        <div className="settings-card">
          <h2><i className="fas fa-user" /> Compte</h2>
          <p>Modifiez vos informations personnelles, adresse et coordonnées depuis votre profil.</p>
          <Link to="/profile" className="settings-btn settings-btn--primary">
            <i className="fas fa-arrow-right" /> Aller au profil
          </Link>
        </div>

        <div className="settings-card">
          <h2><i className="fas fa-shield-alt" /> Changer de mot de passe</h2>
          <form onSubmit={handlePasswordSubmit} className="settings-password" noValidate>
            <TnInput
              label="Mot de passe actuel"
              type="password"
              name="old_password"
              value={passwords.old_password}
              onChange={handlePasswordInput}
              autoComplete="current-password"
              showToggle
              required
              error={pwErrors.old_password}
            />
            <TnInput
              label="Nouveau mot de passe"
              type="password"
              name="new_password"
              value={passwords.new_password}
              onChange={handlePasswordInput}
              autoComplete="new-password"
              showToggle
              required
              helper="8 caractères minimum"
              error={pwErrors.new_password}
            />
            <TnInput
              label="Confirmer le nouveau mot de passe"
              type="password"
              name="new_password_confirm"
              value={passwords.new_password_confirm}
              onChange={handlePasswordInput}
              autoComplete="new-password"
              showToggle
              required
              error={pwErrors.new_password_confirm}
            />
            {pwMessage.text && (
              <p className={`settings-msg settings-msg--${pwMessage.type}`} role="alert">
                <i className={`fas fa-${pwMessage.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
                {pwMessage.text}
              </p>
            )}
            <button type="submit" className="settings-btn settings-btn--primary" disabled={pwLoading}>
              {pwLoading ? <><i className="fas fa-spinner fa-spin" /> Enregistrement…</> : <><i className="fas fa-key" /> Modifier le mot de passe</>}
            </button>
          </form>
          <p className="settings-note">
            Mot de passe oublié ? <Link to="/forgot-password">Recevoir un lien de réinitialisation</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
