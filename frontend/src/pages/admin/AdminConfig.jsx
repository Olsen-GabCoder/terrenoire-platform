import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import { AdminLoading, AdminError, AdminModalSection } from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';

const fmtPrice = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const AdminConfig = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    shipping_free_threshold: '', shipping_cost: '',
    selection_rotation_hours: 24, selection_source: 'all',
  });

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true); setError(null);
      const r = await api.get('/config/delivery/');
      setConfig({
        shipping_free_threshold: r.data.shipping_free_threshold,
        shipping_cost: r.data.shipping_cost,
        selection_rotation_hours: r.data.selection_rotation_hours ?? 24,
        selection_source: r.data.selection_source || 'all',
      });
    } catch { setError('Impossible de charger la configuration'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/config/delivery/', {
        shipping_free_threshold: Number(config.shipping_free_threshold),
        shipping_cost: Number(config.shipping_cost),
        selection_rotation_hours: Number(config.selection_rotation_hours),
        selection_source: config.selection_source,
      });
      toast.success('Configuration mise à jour');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="adm-page-body"><AdminLoading label="Chargement..." /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={fetchConfig} /></div>;

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Configuration']}
        title="Configuration du site"
        subtitle="Gérez les paramètres de livraison et autres réglages."
        actions={<Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>}
      />
      <div className="adm-page-body">
        <div style={{ maxWidth: 600 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ background: 'var(--ds-white)', borderRadius: 14, border: '1px solid var(--tn-gray-200)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--tn-gray-200)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className="fas fa-truck" style={{ color: 'var(--tn-orange)', fontSize: 18 }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Frais de livraison</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--tn-gray-500)' }}>Configurez les coûts et seuils de livraison</p>
                </div>
              </div>
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Frais de livraison (FCFA)
                  </label>
                  <input className="tn-input" name="shipping_cost" type="number" min="0" step="100" value={config.shipping_cost} onChange={handleChange} required />
                  <p style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 4 }}>Appliqué si le panier est sous le seuil</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Seuil livraison gratuite (FCFA)
                  </label>
                  <input className="tn-input" name="shipping_free_threshold" type="number" min="0" step="1000" value={config.shipping_free_threshold} onChange={handleChange} required />
                  <p style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 4 }}>Livraison offerte au-dessus de ce montant</p>
                </div>
              </div>
              <div style={{ padding: '20px 24px', borderTop: '1px solid var(--tn-gray-200)', borderBottom: '1px solid var(--tn-gray-200)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className="fas fa-star" style={{ color: 'var(--tn-orange)', fontSize: 18 }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Sélection de la page d&apos;accueil</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--tn-gray-500)' }}>Tirée au hasard et renouvelée automatiquement</p>
                </div>
              </div>
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Renouvellement
                  </label>
                  <select className="tn-input" name="selection_rotation_hours" value={String(config.selection_rotation_hours)} onChange={handleChange}>
                    <option value="24">Toutes les 24 heures</option>
                    <option value="72">Tous les 3 jours</option>
                    <option value="168">Chaque semaine</option>
                    <option value="0">Jamais (sélection fixe)</option>
                    {!['24', '72', '168', '0'].includes(String(config.selection_rotation_hours)) && (
                      <option value={String(config.selection_rotation_hours)}>Toutes les {config.selection_rotation_hours} heures</option>
                    )}
                  </select>
                  <p style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 4 }}>Un nouveau tirage a lieu à chaque période</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tn-gray-700)', marginBottom: 6 }}>
                    Livres éligibles
                  </label>
                  <select className="tn-input" name="selection_source" value={config.selection_source} onChange={handleChange}>
                    <option value="all">Tous les livres disponibles</option>
                    <option value="featured">Livres marqués « Sélection »</option>
                  </select>
                  <p style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 4 }}>Avec les livres marqués, il en faut plus de 6 pour que la sélection varie</p>
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--tn-gray-100)', background: 'var(--tn-cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--tn-gray-600)' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
                  Actuellement : {fmtPrice(config.shipping_cost)} FCFA de frais, gratuit dès {fmtPrice(config.shipping_free_threshold)} FCFA
                </span>
                <button type="submit" disabled={saving} className="tn-btn tn-btn--primary" style={{ fontSize: 13, padding: '8px 20px' }}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> Sauvegarde...</> : <><i className="fas fa-floppy-disk" /> Sauvegarder</>}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AdminConfig;
