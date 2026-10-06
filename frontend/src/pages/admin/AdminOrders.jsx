import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminStat, AdminFilterPills, AdminSearch, AdminTable, AdminRow, AdminCell,
  AdminActionBtn, AdminAvatar, StatusBadge, AdminLoading, AdminTableSkeleton, AdminError, AdminEmpty,
  AdminModalOverlay, AdminModalHeader, AdminModalBody, AdminModalSection, StatusBtn,
} from '../../components/admin/AdminPrimitives';
import { useToast } from '../../components/ui/ToastProvider';
import api from '../../services/api';
import { formatPhoneDisplay, phoneHref } from '../../utils/phone';

const fmtPrice = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--';

const AdminOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try { setLoading(true); setError(null); const r = await api.get('/orders/', { params: { page_size: 100 } }); setOrders(r.data.results || r.data || []); }
    catch (e) { setError('Impossible de charger les commandes'); console.error(e); }
    finally { setLoading(false); }
  };

  const STATUS_LABELS = { PENDING: 'En attente', PAID: 'Payé', SHIPPED: 'Expédié', CANCELLED: 'Annulé' };

  const updateOrderStatus = async (orderId, newStatus) => {
    // Un changement de statut envoie un e-mail au client : on confirme d'abord
    if (!window.confirm(`Passer la commande #${orderId} au statut « ${STATUS_LABELS[newStatus] || newStatus} » ? Le client sera prévenu par e-mail.`)) return;
    try {
      const r = await api.patch(`/orders/${orderId}/`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...r.data } : o));
      setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, ...r.data } : prev);
      toast.success('Statut de la commande mis à jour');
    } catch (e) { toast.error(e.response?.data?.error || 'Erreur lors de la mise à jour du statut'); }
  };

  const counts = useMemo(() => ({
    all: orders.length,
    PENDING: orders.filter(o => (o.status||'').toUpperCase() === 'PENDING').length,
    PAID: orders.filter(o => (o.status||'').toUpperCase() === 'PAID').length,
    SHIPPED: orders.filter(o => (o.status||'').toUpperCase() === 'SHIPPED').length,
    CANCELLED: orders.filter(o => (o.status||'').toUpperCase() === 'CANCELLED').length,
    revenue: orders.filter(o => ['PAID','SHIPPED'].includes((o.status||'').toUpperCase())).reduce((s,o) => s + Number(o.total_amount||0), 0),
  }), [orders]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? orders : orders.filter(o => (o.status||'').toUpperCase() === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => (o.user?.full_name||o.user?.username||'').toLowerCase().includes(q) || (o.shipping_city||'').toLowerCase().includes(q) || String(o.id).includes(q));
    }
    return list;
  }, [orders, filter, search]);

  if (loading) return <div className="adm-page-body"><AdminTableSkeleton rows={5} columns={6} /></div>;
  if (error) return <div className="adm-page-body"><AdminError message={error} onRetry={fetchOrders} /></div>;

  const sel = selectedOrder;

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Commandes']}
        title="Gestion des commandes"
        subtitle="Consultez et gérez les commandes. Mettez à jour les statuts de livraison."
        actions={
          <Link to="/admin-dashboard" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}>
            <i className="fas fa-arrow-left" /> Retour
          </Link>
        }
      />

      <div className="adm-page-body">
        {/* Stats */}
        <div className="adm-grid-3" style={{ marginBottom: 28 }}>
          <AdminStat icon="fa-layer-group" label="Total" value={counts.all} color="var(--tn-gray-700)" />
          <AdminStat icon="fa-coins" label="Chiffre d'affaires" value={fmtPrice(counts.revenue)} suffix="FCFA" color="var(--tn-success)" metaTone={counts.revenue > 0 ? 'good' : 'muted'} meta={counts.revenue > 0 ? 'Payées + expédiées' : ''} />
          <AdminStat icon="fa-clock" label="En attente" value={counts.PENDING} meta={counts.PENDING > 0 ? 'action requise' : ''} metaTone="alert" color="var(--tn-warning)" />
          <AdminStat icon="fa-circle-check" label="Payées" value={counts.PAID} color="var(--tn-success)" />
          <AdminStat icon="fa-truck" label="Expédiées" value={counts.SHIPPED} color="#1c2a4a" />
          <AdminStat icon="fa-circle-xmark" label="Annulées" value={counts.CANCELLED} color="var(--tn-error)" />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <AdminFilterPills active={filter} onChange={setFilter} items={[
            ['all', 'Toutes', counts.all], ['PENDING', 'En attente', counts.PENDING],
            ['PAID', 'Payées', counts.PAID], ['SHIPPED', 'Expédiées', counts.SHIPPED],
            ['CANCELLED', 'Annulées', counts.CANCELLED],
          ]} />
          <AdminSearch placeholder="Rechercher client, ville, n..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>

        {/* Empty */}
        {filtered.length === 0 && <AdminEmpty icon="fa-inbox" title="Aucune commande pour le moment" subtitle={search ? 'Essayez d\'autres termes.' : 'Les commandes appara\u00eetront ici d\u00e8s qu\'un client passera \u00e0 l\'acte.'} />}

        {/* Table */}
        {filtered.length > 0 && (
          <AdminTable columns={[
            { label: 'Commande', width: 200 }, { label: 'Client' }, { label: 'Ville', width: 140 },
            { label: 'Date', width: 110 }, { label: 'Total', align: 'right', width: 130 },
            { label: 'Statut', width: 130 }, { label: '', align: 'right', width: 60 },
          ]}>
            {filtered.map((o, i) => {
              const itemCount = (o.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
              return (
                <AdminRow key={o.id} last={i === filtered.length - 1}>
                  <AdminCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--tn-orange-50)', color: 'var(--tn-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        <i className="fas fa-bag-shopping" />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--tn-mono)', fontWeight: 700, color: 'var(--tn-gray-900)', fontSize: 12 }}>#{o.id}</div>
                        <div style={{ fontSize: 10, color: 'var(--tn-gray-500)', fontFamily: 'var(--tn-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{itemCount} article{itemCount > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </AdminCell>
                  <AdminCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AdminAvatar name={o.user?.full_name || o.user?.username || '?'} size={32} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--tn-gray-900)', fontSize: 13 }}>{o.user?.full_name || o.user?.username || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: 'var(--tn-gray-500)' }}>{o.user?.email || ''}</div>
                      </div>
                    </div>
                  </AdminCell>
                  <AdminCell muted>{o.shipping_city || '--'}</AdminCell>
                  <AdminCell muted mono>{fmtDate(o.created_at)}</AdminCell>
                  <AdminCell align="right" bold mono>
                    {fmtPrice(o.total_amount)} <span style={{ color: 'var(--tn-gray-500)', fontWeight: 500, fontSize: 10 }}>FCFA</span>
                  </AdminCell>
                  <AdminCell><StatusBadge value={(o.status || '').toLowerCase()} /></AdminCell>
                  <AdminCell align="right">
                    <AdminActionBtn icon="fa-eye" tone="orange" title="Detail" onClick={() => setSelectedOrder(o)} />
                  </AdminCell>
                </AdminRow>
              );
            })}
          </AdminTable>
        )}
      </div>

      {/* ── MODAL ── */}
      {sel && (
        <AdminModalOverlay onClose={() => setSelectedOrder(null)}>
          <AdminModalHeader onClose={() => setSelectedOrder(null)}>
            <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tn-gold-light)', marginBottom: 6 }}>Commande</div>
            <h2 style={{ fontFamily: 'var(--tn-mono)', fontWeight: 700, fontSize: 22, margin: 0, letterSpacing: '0.02em' }}>#{sel.id}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <StatusBadge value={(sel.status || '').toLowerCase()} />
              <span style={{ color: 'var(--tn-gray-400)', fontSize: 12 }}>{fmtDateTime(sel.created_at)}</span>
            </div>
          </AdminModalHeader>

          <AdminModalBody>
            {/* Client */}
            <AdminModalSection icon="fa-user" title="Client">
              <div style={{ background: 'var(--ds-white)', borderRadius: 12, padding: 18, border: '1px solid var(--tn-gray-200)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <AdminAvatar name={sel.user?.full_name || sel.user?.username || '?'} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 17, fontWeight: 600, color: 'var(--tn-gray-900)' }}>{sel.user?.full_name || sel.user?.username || 'N/A'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--tn-gray-700)' }}>
                    <span><i className="fas fa-envelope" style={{ color: 'var(--tn-orange)', width: 16, marginRight: 4 }} />{sel.user?.email || 'N/A'}</span>
                    {/* Téléphone de livraison en priorité (c'est celui du destinataire), sinon celui du profil */}
                    {(sel.shipping_phone || sel.user?.phone_number) && <a href={phoneHref(sel.shipping_phone || sel.user?.phone_number)} style={{ color: 'inherit' }}><i className="fas fa-phone" style={{ color: 'var(--tn-orange)', width: 16, marginRight: 4 }} />{formatPhoneDisplay(sel.shipping_phone || sel.user?.phone_number)}</a>}
                    {sel.shipping_address && <span style={{ gridColumn: '1 / -1' }}><i className="fas fa-location-dot" style={{ color: 'var(--tn-orange)', width: 16, marginRight: 4 }} />{sel.shipping_address}{sel.shipping_city ? `, ${sel.shipping_city}` : ''}</span>}
                  </div>
                </div>
              </div>
            </AdminModalSection>

            {/* Articles */}
            <AdminModalSection icon="fa-book" title="Articles" rightLabel={`${(sel.items || []).length} titre${(sel.items || []).length > 1 ? 's' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(sel.items || []).map((item, idx) => (
                  <div key={item.id || idx} style={{ background: 'var(--ds-white)', borderRadius: 10, padding: 12, border: '1px solid var(--tn-gray-200)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {item.book?.cover_image
                      ? <img src={item.book.cover_image} alt="" style={{ width: 36, height: 50, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                      : <div style={{ width: 36, height: 50, borderRadius: 4, background: 'var(--tn-cream-2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tn-gray-400)', fontSize: 12 }}><i className="fas fa-book" /></div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--tn-serif)', fontWeight: 600, fontSize: 14, color: 'var(--tn-gray-900)' }}>{item.book?.title || 'Article'}</div>
                      <div style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, letterSpacing: '0.04em', padding: '1px 6px', borderRadius: 4, background: item.format_purchased === 'EBOOK' ? 'rgba(21,101,192,0.1)' : 'rgba(232,96,28,0.1)', color: item.format_purchased === 'EBOOK' ? '#1565C0' : '#B5470F' }}>
                          {item.format_purchased === 'EBOOK' ? 'EBOOK' : 'PAPIER'}
                        </span>
                        {item.quantity} × {fmtPrice(item.price)} FCFA
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, color: 'var(--tn-orange)', fontSize: 14, flexShrink: 0 }}>
                      {fmtPrice(item.quantity * item.price)} <span style={{ fontSize: 9, color: 'var(--tn-gray-500)', fontWeight: 500 }}>FCFA</span>
                    </div>
                  </div>
                ))}
              </div>
            </AdminModalSection>

            {/* Amounts */}
            <AdminModalSection icon="fa-calculator" title="Montants">
              <div style={{ background: 'var(--ds-white)', borderRadius: 12, padding: 18, border: '1px solid var(--tn-gray-200)' }}>
                {[
                  ['Sous-total', `${fmtPrice(sel.subtotal || sel.total_amount)} FCFA`],
                  ['Livraison', Number(sel.shipping_cost || 0) === 0 ? 'Gratuit' : `${fmtPrice(sel.shipping_cost)} FCFA`],
                  ...(sel.discount_amount > 0 ? [['Remise', `-${fmtPrice(sel.discount_amount)} FCFA`, true]] : []),
                ].map(([l, v, green]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: green ? 'var(--tn-success)' : 'var(--tn-gray-700)' }}>
                    <span>{l}</span>
                    <span style={{ fontFamily: 'var(--tn-mono)', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                <div className="tn-motif-divider" style={{ margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 16 }}>Total TTC</span>
                  <span style={{ fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: 22, color: 'var(--tn-orange)' }}>
                    {fmtPrice(sel.total_amount)} <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 11, color: 'var(--tn-gray-500)', fontWeight: 500 }}>FCFA</span>
                  </span>
                </div>
              </div>
            </AdminModalSection>

            {/* Status change */}
            <AdminModalSection icon="fa-rotate" title="Changer le statut">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  ['PENDING', 'En attente', 'fa-clock'],
                  ['PAID', 'Payée', 'fa-check'],
                  ['SHIPPED', 'Expédiée', 'fa-truck'],
                  ['CANCELLED', 'Annulée', 'fa-times'],
                ].map(([s, l, ic]) => (
                  <StatusBtn key={s} statusKey={s.toLowerCase()} label={l} icon={ic} isCurrent={(sel.status || '').toUpperCase() === s} onClick={() => updateOrderStatus(sel.id, s)} />
                ))}
              </div>
            </AdminModalSection>
          </AdminModalBody>
        </AdminModalOverlay>
      )}
    </>
  );
};

export default AdminOrders;
