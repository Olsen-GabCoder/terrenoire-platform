import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Settings.css';

const Settings = () => {
  const { user, authChecked, updateProfile } = useAuth();
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
                checked={receiveNewsletter}
                onChange={handleNewsletterChange}
                disabled={loading}
              />
              <span className="settings-toggle__slider" />
            </label>
          </div>
          {message.text && (
            <p className={`settings-msg settings-msg--${message.type}`}>
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
          <h2><i className="fas fa-shield-alt" /> Sécurité</h2>
          <p>Pour modifier votre mot de passe ou sécuriser votre compte, contactez-nous à terrenoireeditions@gmail.com.</p>
        </div>
      </div>
      <div className="settings-footer-fade" />
    </div>
  );
};

export default Settings;
