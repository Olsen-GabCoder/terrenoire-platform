import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import manuscriptService from '../services/manuscriptService';
import TnInput from '../components/ui/TnInput';
import TnPhoneInput from '../components/ui/TnPhoneInput';
import { validatePhone, phoneForApi } from '../utils/phone';
import TnSelect from '../components/ui/TnSelect';
import TnTextarea from '../components/ui/TnTextarea';
import TnButton from '../components/ui/TnButton';
import TnAlert from '../components/ui/TnAlert';
import TnCheckbox from '../components/ui/TnCheckbox';
import '../styles/SubmitManuscript.css';

const GENRE_OPTIONS = [
  { value: 'ROMAN', label: 'Roman' },
  { value: 'NOUVELLE', label: 'Nouvelle / Recueil de nouvelles' },
  { value: 'POESIE', label: 'Poésie' },
  { value: 'ESSAI', label: 'Essai' },
  { value: 'THEATRE', label: 'Théâtre' },
  { value: 'JEUNESSE', label: 'Littérature jeunesse' },
  { value: 'BD', label: 'Bande dessinée' },
  { value: 'AUTRE', label: 'Autre' },
];

const LANGUAGE_OPTIONS = [
  { value: 'FR', label: 'Français' },
  { value: 'EN', label: 'Anglais' },
  { value: 'AR', label: 'Arabe' },
  { value: 'PT', label: 'Portugais' },
  { value: 'ES', label: 'Espagnol' },
  { value: 'AUTRE', label: 'Autre' },
];

const SubmitManuscript = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    author_name: '',
    pen_name: '',
    email: '',
    phone_number: '',
    country: '',
    genre: 'ROMAN',
    language: 'FR',
    page_count: '',
    description: '',
    terms_accepted: false,
  });

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: null }));
  };

  const descWordCount = formData.description.trim() ? formData.description.trim().split(/\s+/).length : 0;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validExtensions = ['pdf', 'doc', 'docx'];
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        setError('Format de fichier invalide. Formats acceptés : PDF, DOC, DOCX');
        setFile(null);
        setFileName('');
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setError('Le fichier est trop volumineux. Taille maximale : 10 MB');
        setFile(null);
        setFileName('');
        return;
      }

      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    if (!file) {
      setError('Veuillez sélectionner un fichier manuscrit');
      setIsSubmitting(false);
      return;
    }

    const phoneError = validatePhone(formData.phone_number, { required: true, allowForeign: true });
    if (phoneError) {
      setFieldErrors((p) => ({ ...p, phone_number: phoneError }));
      setIsSubmitting(false);
      return;
    }

    if (formData.description.trim().length < 50) {
      setFieldErrors((p) => ({ ...p, description: 'Minimum 50 caractères' }));
      setIsSubmitting(false);
      return;
    }

    if (!formData.terms_accepted) {
      setError('Vous devez accepter les conditions de soumission.');
      setIsSubmitting(false);
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('author_name', formData.author_name);
      if (formData.pen_name) submitData.append('pen_name', formData.pen_name);
      submitData.append('email', formData.email);
      submitData.append('phone_number', phoneForApi(formData.phone_number));
      if (formData.country) submitData.append('country', formData.country);
      submitData.append('genre', formData.genre);
      submitData.append('language', formData.language);
      if (formData.page_count) submitData.append('page_count', formData.page_count);
      submitData.append('description', formData.description);
      submitData.append('terms_accepted', formData.terms_accepted);
      submitData.append('file', file);

      const response = await manuscriptService.submitManuscript(submitData);
      const data = response?.data?.data ?? response?.data;
      setSubmittedId(data?.id ?? null);
      setSuccess(true);

      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.detail && !data.message) {
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => {
          normalized[k] = Array.isArray(v) ? v[0] : v;
        });
        setFieldErrors(normalized);
        const firstMsg = Object.values(normalized)[0];
        setError(firstMsg || 'Veuillez corriger les erreurs ci-dessous.');
      } else {
        setError(
          data?.detail ||
          data?.message ||
          'Une erreur est survenue lors de la soumission du manuscrit'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="submit-manuscript-page">
        <section className="submit-manuscript-hero">
          <div className="submit-manuscript-hero__orb submit-manuscript-hero__orb--1" />
          <div className="submit-manuscript-hero__orb submit-manuscript-hero__orb--2" />
          <div className="submit-manuscript-hero__grid-bg" />
          <div className="submit-manuscript-hero__inner">
            <div className="submit-manuscript-hero__line" />
            <h1 className="submit-manuscript-hero__title">Soumission reçue</h1>
            <p className="submit-manuscript-hero__sub">Merci pour votre confiance.</p>
          </div>
        </section>
        <div className="submit-manuscript-hero-fade" />
        <div className="submit-manuscript-container success-view">
          <div className="success-card">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h1>Manuscrit reçu !</h1>
            <p className="success-message">
              Merci pour votre soumission. Notre équipe éditoriale examinera votre manuscrit
              et vous contactera sous peu à <strong>{formData.email}</strong>.
            </p>
            <div className="success-details">
              {submittedId && (
                <p className="success-ref">
                  <strong>Référence :</strong> MS-{String(submittedId).padStart(5, '0')}
                </p>
              )}
              <p>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Délai de réponse : 2-4 semaines
              </p>
            </div>
            <p className="redirect-message">Redirection vers l'accueil dans 5 secondes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="submit-manuscript-page">
      <section className="submit-manuscript-hero">
        <div className="submit-manuscript-hero__orb submit-manuscript-hero__orb--1" />
        <div className="submit-manuscript-hero__orb submit-manuscript-hero__orb--2" />
        <div className="submit-manuscript-hero__grid-bg" />
        <div className="submit-manuscript-hero__inner">
          <div className="submit-manuscript-hero__line" />
          <h1 className="submit-manuscript-hero__title">Soumettez votre manuscrit</h1>
          <p className="submit-manuscript-hero__sub">
            Vous êtes auteur ? Partagez votre œuvre avec nous. Notre équipe éditoriale examine chaque projet avec attention.
          </p>
        </div>
      </section>
      <div className="submit-manuscript-hero-fade" />
      <div className="submit-manuscript-container">
        <div className="submit-manuscript-content">
          {/* Left Side - Info Cards */}
          <div className="info-section">
            <div className="info-card">
              <div className="info-card-header">
                <div className="info-icon">
                  <i className="fas fa-book-open"></i>
                </div>
                <h3>Pourquoi nous choisir ?</h3>
              </div>
              <ul className="info-list">
                <li>
                  <span className="list-icon">
                    <i className="fas fa-check"></i>
                  </span>
                  <span className="list-text">Plateforme dédiée aux auteurs africains</span>
                </li>
                <li>
                  <span className="list-icon">
                    <i className="fas fa-check"></i>
                  </span>
                  <span className="list-text">Processus de sélection transparent</span>
                </li>
                <li>
                  <span className="list-icon">
                    <i className="fas fa-check"></i>
                  </span>
                  <span className="list-text">Accompagnement personnalisé</span>
                </li>
                <li>
                  <span className="list-icon">
                    <i className="fas fa-check"></i>
                  </span>
                  <span className="list-text">Large réseau de distribution</span>
                </li>
              </ul>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <div className="info-icon">
                  <i className="fas fa-lightbulb"></i>
                </div>
                <h3>Formats acceptés</h3>
              </div>
              <div className="format-badges">
                <div className="format-badge">
                  <i className="fas fa-file-pdf"></i>
                  <span>PDF</span>
                </div>
                <div className="format-badge">
                  <i className="fas fa-file-word"></i>
                  <span>DOC</span>
                </div>
                <div className="format-badge">
                  <i className="fas fa-file-word"></i>
                  <span>DOCX</span>
                </div>
              </div>
              <div className="format-note">
                <i className="fas fa-info-circle"></i>
                <span>Taille maximale : 10 MB</span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <div className="info-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <h3>Processus de sélection</h3>
              </div>
              <div className="process-steps">
                <div className="process-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <div className="step-title">Réception</div>
                    <div className="step-description">Confirmation immédiate</div>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <div className="step-title">Examen</div>
                    <div className="step-description">Lecture par notre comité (2-4 semaines)</div>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <div className="step-title">Décision</div>
                    <div className="step-description">Réponse par email</div>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <div className="step-title">Publication</div>
                    <div className="step-description">Si accepté, début du processus</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="form-section">
            <form onSubmit={handleSubmit} className="manuscript-form">
              <div className="form-header">
                <div className="form-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                </div>
                <h2>Formulaire de Soumission</h2>
              </div>

              {error && (
                <TnAlert variant="error">{error}</TnAlert>
              )}

              <div className="form-grid">
                <TnInput
                  label="Titre du Manuscrit"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Les Aventures de..."
                  required
                  error={fieldErrors.title}
                  helper="Le titre doit être clair et accrocheur"
                  leftIcon={<i className="fas fa-book" />}
                />

                <TnInput
                  label="Votre Nom Complet"
                  type="text"
                  name="author_name"
                  value={formData.author_name}
                  onChange={handleChange}
                  placeholder="Prénom Nom"
                  required
                  error={fieldErrors.author_name}
                  leftIcon={<i className="fas fa-user" />}
                />

                <TnInput
                  label="Pseudonyme / Nom de plume"
                  type="text"
                  name="pen_name"
                  value={formData.pen_name}
                  onChange={handleChange}
                  placeholder="Optionnel"
                  helper="Optionnel"
                  error={fieldErrors.pen_name}
                  leftIcon={<i className="fas fa-user-pen" />}
                />

                <TnInput
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="votre@email.com"
                  required
                  error={fieldErrors.email}
                  helper="Nous communiquerons par email"
                  leftIcon={<i className="fas fa-envelope" />}
                />

                <TnPhoneInput
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  helper="Hors du Gabon : format international, ex. +33 6 12 34 56 78"
                  error={fieldErrors.phone_number}
                />

                <TnInput
                  label="Pays / Nationalité"
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Ex: Gabon, Cameroun..."
                  error={fieldErrors.country}
                  leftIcon={<i className="fas fa-globe" />}
                />

                <div className="form-group full-width form-row-3">
                  <TnSelect
                    label="Genre littéraire"
                    name="genre"
                    required
                    value={formData.genre}
                    onChange={handleChange}
                    leftIcon={<i className="fas fa-book-open" />}
                    options={GENRE_OPTIONS}
                  />
                  <TnSelect
                    label="Langue du manuscrit"
                    name="language"
                    required
                    value={formData.language}
                    onChange={handleChange}
                    leftIcon={<i className="fas fa-language" />}
                    options={LANGUAGE_OPTIONS}
                  />
                  <TnInput
                    label="Nombre de pages"
                    type="number"
                    name="page_count"
                    value={formData.page_count}
                    onChange={handleChange}
                    placeholder="Ex: 250"
                    min="1"
                    max="10000"
                    leftIcon={<i className="fas fa-file-lines" />}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-group full-width">
                <TnTextarea
                  label="Description du Manuscrit"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Résumé, thématique, public cible..."
                  rows={5}
                  minLength={50}
                  required
                  error={fieldErrors.description}
                  leftIcon={<i className="fas fa-align-left" />}
                  helper={!fieldErrors.description ? `${descWordCount} mot${descWordCount !== 1 ? 's' : ''} — minimum 50 caractères (200-500 mots recommandés)` : undefined}
                />
              </div>

              {/* File Upload */}
              <div className="form-group full-width">
                <label htmlFor="file" className="form-label">
                  <span className="label-text">Fichier Manuscrit</span>
                  <span className="required">*</span>
                </label>
                <div className="file-upload-group">
                  <input
                    type="file"
                    id="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="file-input"
                    required
                  />
                  <label htmlFor="file" className="file-input-label">
                    <div className="file-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <div className="file-content">
                      <div className="file-title">
                        {fileName || 'Cliquez pour choisir un fichier'}
                      </div>
                      <div className="file-subtitle">
                        Formats supportés: PDF, DOC, DOCX (max. 10 MB)
                      </div>
                    </div>
                    <div className="file-browse">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                      <span>Parcourir</span>
                    </div>
                  </label>
                  
                  {fileName && (
                    <div className="selected-file">
                      <div className="selected-file-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </div>
                      <div className="selected-file-info">
                        <div className="selected-file-name">{fileName}</div>
                        <div className="selected-file-size">
                          {(file?.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                      <button
                        type="button"
                        className="remove-file"
                        onClick={() => {
                          setFile(null);
                          setFileName('');
                          document.getElementById('file').value = '';
                        }}
                        aria-label="Supprimer le fichier"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Acceptation des conditions */}
              <div className="form-group full-width form-terms">
                <TnCheckbox
                  checked={formData.terms_accepted}
                  onChange={(checked) => setFormData(prev => ({ ...prev, terms_accepted: checked }))}
                  required
                  disabled={isSubmitting}
                  label={<>
                    J'accepte les{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ds-orange)' }}>conditions de soumission</a>
                    {' '}et la politique de confidentialité de Terre Noire Éditions.
                  </>}
                />
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <TnButton
                  type="submit"
                  variant="primary"
                  block
                  loading={isSubmitting}
                  disabled={isSubmitting || !file || !formData.terms_accepted}
                  leftIcon={<i className="fas fa-paper-plane" />}
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Soumettre le Manuscrit'}
                </TnButton>

                <TnButton
                  type="button"
                  variant="outline"
                  block
                  onClick={() => navigate(-1)}
                  leftIcon={<i className="fas fa-arrow-left" />}
                >
                  Retour
                </TnButton>
              </div>

              {/* Form Note */}
              <div className="form-note">
                <div className="note-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div className="note-content">
                  Vos données sont protégées et ne seront utilisées que dans le cadre
                  du processus de sélection. Consultez notre <Link to="/privacy" className="privacy-link" target="_blank" rel="noopener noreferrer">politique de confidentialité</Link>.
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitManuscript;