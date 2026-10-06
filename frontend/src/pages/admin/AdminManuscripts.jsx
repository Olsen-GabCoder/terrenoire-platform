import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminStat, AdminFilterPills, AdminSearch, AdminTable, AdminRow, AdminCell,
  AdminActionBtn, AdminAvatar, StatusBadge, GenrePill, AdminLoading, AdminTableSkeleton, AdminError, AdminEmpty,
  AdminModalOverlay, AdminModalHeader, AdminModalBody, AdminModalSection, StatusBtn,
} from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';
import { formatPhoneDisplay, phoneHref } from '../../utils/phone';

const GENRE_LABELS = { ROMAN:'Roman', NOUVELLE:'Nouvelle', POESIE:'Poésie', ESSAI:'Essai', THEATRE:'Théâtre', JEUNESSE:'Jeunesse', BD:'BD', AUTRE:'Autre' };
const LANG_LABELS = { FR:'Français', EN:'Anglais', AR:'Arabe', PT:'Portugais', ES:'Espagnol', AUTRE:'Autre' };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '--';
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '--';

const AdminManuscripts = () => {
  const { toast, confirm } = useToast();
  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetch_(); }, []);
  const fetch_ = async () => { try { setLoading(true); setError(null); const r = await api.get('/manuscripts/'); setManuscripts(r.data.results || r.data); } catch(e){ setError('Impossible de charger les manuscrits'); } finally { setLoading(false); } };

  const updateStatus = async (id, s) => { try { await api.patch(`/manuscripts/${id}/update-status/`, { status: s }); fetch_(); setSel(null); toast.success('Statut mis à jour'); } catch(e){ toast.error('Échec de la mise à jour du statut'); } };

  const downloadManuscript = async (m) => {
    try {
      const response = await api.get(`/manuscripts/${m.id}/download/`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${m.title || 'manuscrit'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Erreur lors du téléchargement du manuscrit');
    }
  };
  const deleteMs = async (id) => {
    const ok = await confirm({ title: 'Supprimer ce manuscrit ?', message: 'Cette action est irréversible. Le manuscrit et ses fichiers seront supprimés.', confirmLabel: 'Supprimer', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/manuscripts/${id}/`); fetch_(); setSel(null); toast.success('Manuscrit supprimé'); } catch(e){ toast.error('Échec de la suppression'); }
  };

  const counts = useMemo(() => ({
    all: manuscripts.length,
    PENDING: manuscripts.filter(m => m.status === 'PENDING').length,
    REVIEWING: manuscripts.filter(m => m.status === 'REVIEWING').length,
    ACCEPTED: manuscripts.filter(m => m.status === 'ACCEPTED').length,
    REJECTED: manuscripts.filter(m => m.status === 'REJECTED').length,
  }), [manuscripts]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? manuscripts : manuscripts.filter(m => m.status === filter);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(m => (m.title||'').toLowerCase().includes(q) || (m.author_name||'').toLowerCase().includes(q) || (m.email||'').toLowerCase().includes(q)); }
    return list;
  }, [manuscripts, filter, search]);

  if (loading) return <div className="adm-page-body"><AdminTableSkeleton rows={5} columns={5} /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={() => window.location.reload()} /></div>;

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Manuscrits']}
        title="Gestion des manuscrits"
        subtitle="Examinez les soumissions, changez les statuts et téléchargez les fichiers des auteurs."
        actions={<Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}><i className="fas fa-arrow-left" /> Retour</Link>}
      />

      <div className="adm-page-body">
        {/* Stats */}
        <div className="adm-grid-5" style={{ marginBottom: 28 }}>
          <AdminStat icon="fa-layer-group" label="Total" value={counts.all} color="var(--tn-gray-700)" />
          <AdminStat icon="fa-clock" label="En attente" value={counts.PENDING} meta={counts.PENDING > 0 ? 'à examiner' : ''} metaTone="alert" color="var(--tn-warning)" />
          <AdminStat icon="fa-magnifying-glass" label="En examen" value={counts.REVIEWING} color="#1c2a4a" />
          <AdminStat icon="fa-circle-check" label="Acceptés" value={counts.ACCEPTED} color="var(--tn-success)" />
          <AdminStat icon="fa-circle-xmark" label="Refusés" value={counts.REJECTED} color="var(--tn-error)" />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <AdminFilterPills active={filter} onChange={setFilter} items={[
            ['all','Tous',counts.all], ['PENDING','En attente',counts.PENDING], ['REVIEWING','En examen',counts.REVIEWING],
            ['ACCEPTED','Acceptés',counts.ACCEPTED], ['REJECTED','Refusés',counts.REJECTED],
          ]} />
          <AdminSearch placeholder="Rechercher titre, auteur, email..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>

        {filtered.length === 0 && <AdminEmpty icon="fa-file-circle-question" title="Aucun manuscrit soumis" subtitle={search ? 'Essayez d\'autres termes.' : 'Les manuscrits envoy\u00e9s par les auteurs appara\u00eetront ici, en attente de votre lecture.'} />}

        {/* Table */}
        {filtered.length > 0 && (
          <AdminTable columns={[
            { label: 'Manuscrit', width: 300 }, { label: 'Genre', width: 120 }, { label: 'Auteur' },
            { label: 'Soumis le', width: 120 }, { label: 'Statut', width: 130 }, { label: '', align: 'right', width: 100 },
          ]}>
            {filtered.map((m, i) => (
              <AdminRow key={m.id} last={i === filtered.length - 1}>
                <AdminCell>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 38, height: 50, borderRadius: 4, background: 'var(--tn-cream-2)', border: '1px solid var(--tn-gray-200)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tn-orange)', fontSize: 16, flexShrink: 0 }}>
                      <i className="fas fa-scroll" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 14, fontWeight: 600, color: 'var(--tn-gray-900)', lineHeight: 1.3 }}>{m.title}</div>
                      <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gray-500)', marginTop: 4, letterSpacing: '0.08em' }}>#{m.id}</div>
                    </div>
                  </div>
                </AdminCell>
                <AdminCell><GenrePill value={m.genre} /></AdminCell>
                <AdminCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AdminAvatar name={m.author_name} size={30} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--tn-gray-900)' }}>{m.author_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--tn-gray-500)' }}>{m.email}</div>
                    </div>
                  </div>
                </AdminCell>
                <AdminCell muted mono>{fmtDate(m.submitted_at)}</AdminCell>
                <AdminCell><StatusBadge value={(m.status||'').toLowerCase()} /></AdminCell>
                <AdminCell align="right">
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <AdminActionBtn icon="fa-eye" tone="orange" title="Details" onClick={() => setSel(m)} />
                    {(m.file_url || m.file) && <AdminActionBtn icon="fa-download" tone="gray" title="Télécharger" onClick={() => downloadManuscript(m)} />}
                  </div>
                </AdminCell>
              </AdminRow>
            ))}
          </AdminTable>
        )}
      </div>

      {/* ── MODAL ── */}
      {sel && (
        <AdminModalOverlay onClose={() => setSel(null)}>
          <AdminModalHeader onClose={() => setSel(null)}>
            <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tn-gold-light)', marginBottom: 6 }}>Manuscrit · #{sel.id}</div>
            <h2 style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 26, margin: 0, letterSpacing: '-0.01em' }}>{sel.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <StatusBadge value={(sel.status||'').toLowerCase()} />
              <GenrePill value={sel.genre} />
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'var(--tn-gold-light)', fontSize: 11, fontWeight: 600, border: '1px solid rgba(200,149,108,0.3)' }}>
                {LANG_LABELS[sel.language] || sel.language || 'FR'}{sel.page_count ? ` · ${sel.page_count} pages` : ''}
              </span>
            </div>
          </AdminModalHeader>

          <AdminModalBody>
            {/* Auteur */}
            <AdminModalSection icon="fa-user-pen" title="Auteur">
              <div style={{ background: 'var(--ds-white)', borderRadius: 12, padding: 18, border: '1px solid var(--tn-gray-200)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <AdminAvatar name={sel.author_name} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 17, fontWeight: 600, color: 'var(--tn-gray-900)' }}>
                    {sel.author_name}
                    {sel.pen_name && <span style={{ fontStyle: 'italic', color: 'var(--tn-gray-500)', fontWeight: 400, fontSize: 14 }}> · « {sel.pen_name} »</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--tn-gray-700)' }}>
                    <span><i className="fas fa-envelope" style={{ color: 'var(--tn-orange)', width: 16, marginRight: 4 }} />{sel.email}</span>
                    {sel.phone_number && <a href={phoneHref(sel.phone_number)} style={{ color: 'inherit' }}><i className="fas fa-phone" style={{ color: 'var(--tn-orange)', width: 16, marginRight: 4 }} />{formatPhoneDisplay(sel.phone_number)}</a>}
                    {sel.country && <span style={{ gridColumn: '1 / -1' }}><i className="fas fa-flag" style={{ color: 'var(--tn-orange)', width: 16, marginRight: 4 }} />{sel.country}</span>}
                  </div>
                </div>
              </div>
            </AdminModalSection>

            {/* Details */}
            <AdminModalSection icon="fa-book" title="Details">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <DetailTile label="Soumis le" value={fmtDate(sel.submitted_at)} />
                <DetailTile label="Pages" value={sel.page_count ?? '--'} />
                <DetailTile label="Conditions" value={sel.terms_accepted ? 'Oui' : 'Non'} tone={sel.terms_accepted ? 'good' : 'bad'} icon={sel.terms_accepted ? 'fa-check' : 'fa-times'} />
              </div>
            </AdminModalSection>

            {/* Fichier */}
            {(sel.file_url || sel.file) && (
              <AdminModalSection icon="fa-file-pdf" title="Fichier">
                <div style={{ background: 'var(--ds-white)', borderRadius: 12, padding: 16, border: '1px solid var(--tn-gray-200)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 42, height: 50, borderRadius: 6, background: 'rgba(198,40,40,0.1)', color: 'var(--tn-error)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    <i className="fas fa-file-pdf" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 12, color: 'var(--tn-gray-900)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(sel.file_url || sel.file || '').split('/').pop() || 'manuscrit.pdf'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 4 }}>Soumis le {fmtDate(sel.submitted_at)}</div>
                  </div>
                  <button onClick={() => downloadManuscript(sel)} className="tn-btn tn-btn--primary tn-btn--sm">
                    <i className="fas fa-download" /> Télécharger
                  </button>
                </div>
              </AdminModalSection>
            )}

            {/* Description */}
            <AdminModalSection icon="fa-align-left" title="Description">
              <div style={{ padding: '14px 18px', borderRadius: 10, background: 'var(--ds-white)', borderLeft: '4px solid var(--tn-orange)', border: '1px solid var(--tn-gray-200)', fontFamily: 'var(--tn-serif)', fontSize: 14, fontStyle: 'italic', lineHeight: 1.65, color: 'var(--tn-gray-700)' }}>
                {sel.description ? `« ${sel.description} »` : 'Aucune description fournie.'}
              </div>
            </AdminModalSection>

            {/* Statut */}
            <AdminModalSection icon="fa-rotate" title="Changer le statut">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[['PENDING','En attente','fa-clock'],['REVIEWING','En examen','fa-magnifying-glass'],['ACCEPTED','Accepter','fa-check'],['REJECTED','Refuser','fa-times']].map(([s,l,ic]) => (
                  <StatusBtn key={s} statusKey={s.toLowerCase()} label={l} icon={ic} isCurrent={(sel.status||'').toUpperCase() === s} onClick={() => updateStatus(sel.id, s)} />
                ))}
              </div>
            </AdminModalSection>

            {/* Danger */}
            <div style={{ borderTop: '1px solid var(--tn-gray-200)', paddingTop: 18 }}>
              <button onClick={() => deleteMs(sel.id)} style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(198,40,40,0.3)', color: 'var(--tn-error)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <i className="fas fa-trash-can" style={{ marginRight: 8 }} /> Supprimer ce manuscrit
              </button>
            </div>
          </AdminModalBody>
        </AdminModalOverlay>
      )}
    </>
  );
};

function DetailTile({ label, value, tone, icon }) {
  const fg = tone === 'good' ? 'var(--tn-success)' : tone === 'bad' ? 'var(--tn-error)' : 'var(--tn-gray-900)';
  return (
    <div style={{ background: 'var(--ds-white)', borderRadius: 10, padding: 14, border: '1px solid var(--tn-gray-200)' }}>
      <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tn-gray-500)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {icon && <i className={`fas ${icon}`} style={{ color: fg, fontSize: 13 }} />}
        <span style={{ fontFamily: 'var(--tn-serif)', fontSize: 18, fontWeight: 700, color: fg, letterSpacing: '-0.01em' }}>{value}</span>
      </div>
    </div>
  );
}

export default AdminManuscripts;
