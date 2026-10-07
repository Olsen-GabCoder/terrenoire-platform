import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AdminTopbar } from '../../components/admin/AdminLayout';
import {
  AdminStat, AdminSectionTitle, AdminCard, AdminAvatar, StatusBadge,
  AdminLoading, AdminError,
} from '../../components/admin/AdminPrimitives';
import api from '../../services/api';
import { APP_VERSION } from '../../utils/appVersion';

const fmtPrice = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const DAYS = ['DIMANCHE','LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI'];
const MONTHS = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];

function getGreetName(user) {
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  return { prefix, name: user?.first_name || user?.username || 'Admin' };
}

function getDateLine() {
  const d = new Date();
  const day = DAYS[d.getDay()];
  const date = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day} · ${date} ${month} ${year} · ${h} h ${m}`;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [bookStats, setBookStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [manuscripts, setManuscripts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiVersion, setApiVersion] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [bRes, oRes, mRes, uRes, hRes] = await Promise.allSettled([
          api.get('/books/statistics/'),
          api.get('/orders/', { params: { page_size: 50 } }),
          api.get('/manuscripts/'),
          api.get('/users/'),
          api.get('/health/'),
        ]);
        if (hRes.status === 'fulfilled') setApiVersion(hRes.value.data?.version || '');
        if (bRes.status === 'fulfilled') setBookStats(bRes.value.data);
        if (oRes.status === 'fulfilled') setOrders(oRes.value.data.results || oRes.value.data || []);
        if (mRes.status === 'fulfilled') setManuscripts(mRes.value.data.results || mRes.value.data || []);
        if (uRes.status === 'fulfilled') setUsers(Array.isArray(uRes.value.data) ? uRes.value.data : (uRes.value.data.results || []));
      } catch (err) {
        setError('Impossible de charger les données');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const orderStats = useMemo(() => {
    const pending = orders.filter(o => (o.status || '').toUpperCase() === 'PENDING').length;
    const revenue = orders
      .filter(o => ['PAID', 'SHIPPED'].includes((o.status || '').toUpperCase()))
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
    return { total: orders.length, pending, revenue };
  }, [orders]);

  const manuscriptStats = useMemo(() => ({
    total: manuscripts.length,
    pending: manuscripts.filter(m => m.status === 'PENDING').length,
  }), [manuscripts]);

  const recentOrders = useMemo(() =>
    [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
  [orders]);

  const recentManuscripts = useMemo(() =>
    [...manuscripts].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 4),
  [manuscripts]);

  const greet = getGreetName(user);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <AdminLoading label="Chargement du tableau de bord..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <AdminError message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <>
      <AdminTopbar
        breadcrumb={['Admin', 'Tableau de bord']}
        title={<>{greet.prefix}, <em style={{ fontStyle: 'italic', color: 'var(--tn-orange)', fontWeight: 600 }}>{greet.name}</em></>}
        subtitle="Tableau de bord Terre Noire Éditions — vue d'ensemble de votre activité."
        actions={
          <>
            <Link to="/" className="tn-btn tn-btn--outline" style={{ fontSize: 13, padding: '8px 14px' }}>
              <i className="fas fa-arrow-up-right-from-square" /> Voir le site
            </Link>
            <Link to="/admin-dashboard/books" className="tn-btn tn-btn--primary" style={{ fontSize: 13, padding: '8px 14px' }}>
              <i className="fas fa-plus" /> Nouveau livre
            </Link>
          </>
        }
      />

      <div className="adm-page-body">
        {/* ── Headline strip ── */}
        <div className="adm-headline-strip" style={{
          background: 'var(--tn-black)', color: 'var(--tn-cream)',
          borderRadius: 14, padding: '20px 28px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 24, position: 'relative', overflow: 'hidden',
        }}>
          <div className="tn-motif-bg" style={{ position: 'absolute', inset: 0, opacity: 0.07 }} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gold-light)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {getDateLine()}
            </span>
            <span style={{ fontFamily: 'var(--tn-serif)', fontSize: 17, fontStyle: 'italic' }}>
              {orderStats.pending > 0
                ? `« ${orderStats.pending} commande${orderStats.pending > 1 ? 's' : ''} en attente, ${manuscriptStats.pending} manuscrit${manuscriptStats.pending > 1 ? 's' : ''} à examiner. »`
                : `« Tout est à jour — bonne journée ! »`
              }
            </span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <PulseDot />
            <span style={{ fontSize: 12, color: 'var(--tn-gray-400)' }}>
              API en ligne
              <span style={{ display: 'block', fontFamily: 'var(--tn-mono)', fontSize: 11, marginTop: 2 }}>
                Site v{APP_VERSION}{apiVersion ? ` · API v${apiVersion}` : ''}
              </span>
            </span>
          </div>
        </div>

        {/* ── 6 KPIs ── */}
        <div className="adm-grid-3" style={{ marginBottom: 32 }}>
          <AdminStat icon="fa-book" label="Livres au catalogue" value={bookStats?.total_books ?? 0} meta={`${bookStats?.available_books ?? 0} disponibles`} color="var(--tn-orange)" />
          <AdminStat icon="fa-coins" label="Chiffre d'affaires" value={fmtPrice(orderStats.revenue)} suffix="FCFA" meta={orderStats.revenue > 0 ? 'Commandes payées + expédiées' : 'Aucune vente'} metaTone={orderStats.revenue > 0 ? 'good' : 'muted'} color="var(--tn-success)" />
          <AdminStat icon="fa-bag-shopping" label="Commandes" value={orderStats.total} meta={orderStats.pending > 0 ? `${orderStats.pending} en attente` : 'Aucune en attente'} metaTone={orderStats.pending > 0 ? 'alert' : 'muted'} color="var(--tn-warning)" />
          <AdminStat icon="fa-pen-to-square" label="Manuscrits reçus" value={manuscriptStats.total} meta={manuscriptStats.pending > 0 ? `${manuscriptStats.pending} à traiter` : 'Tous traités'} metaTone={manuscriptStats.pending > 0 ? 'alert' : 'muted'} color="var(--tn-orange)" />
          <AdminStat icon="fa-users" label="Utilisateurs" value={users.length} meta={`${users.filter(u => u.is_active).length} actifs`} color="var(--tn-gold-dark)" />
          <AdminStat icon="fa-feather" label="Auteurs" value={bookStats?.total_authors ?? 0} meta={`${bookStats?.bestsellers_count ?? 0} best-sellers`} color="var(--tn-orange-hover)" />
        </div>

        {/* ── Quick access ── */}
        <AdminSectionTitle icon="fa-bolt" eyebrow="Sections" title="Accès rapide" />
        <div className="adm-grid-5" style={{ marginBottom: 36 }}>
          {[
            ['/admin-dashboard/books', 'fa-book', 'Catalogue', 'Ajouter, modifier et gérer les livres', 'var(--tn-orange)'],
            ['/admin-dashboard/orders', 'fa-bag-shopping', 'Commandes', 'Suivre et traiter les commandes clients', 'var(--tn-success)'],
            ['/admin-dashboard/authors', 'fa-feather', 'Auteurs', 'Gestion des auteurs et biographies', 'var(--tn-gold-dark)'],
            ['/admin-dashboard/manuscripts', 'fa-pen-to-square', 'Manuscrits', 'Examiner les soumissions reçues', 'var(--tn-orange-hover)'],
            ['/admin-dashboard/users', 'fa-users', 'Utilisateurs', 'Gestion des comptes et permissions', 'var(--tn-gray-700)'],
            ['/admin-dashboard/newsletter', 'fa-envelope', 'Newsletter', 'Abonnés et statistiques newsletter', '#3B82F6'],
            ['/admin-dashboard/coupons', 'fa-ticket', 'Coupons', 'Créer et gérer les codes promo', '#8B5CF6'],
            ['/admin-dashboard/contact', 'fa-message', 'Contact', 'Consulter les messages reçus', '#0EA5E9'],
            ['/admin-dashboard/config', 'fa-cog', 'Configuration', 'Frais de livraison et paramètres', 'var(--tn-gray-600)'],
          ].map(([to, icon, label, desc, color]) => (
            <Link key={to} to={to} style={{
              background: 'var(--ds-white)', border: '1px solid var(--tn-gray-200)',
              borderRadius: 14, padding: 18,
              display: 'flex', flexDirection: 'column', gap: 10,
              textDecoration: 'none', cursor: 'pointer', position: 'relative',
              transition: 'all .2s var(--tn-ease)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `${color}18`, color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15,
              }}>
                <i className={`fas ${icon}`} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 17, fontWeight: 600, color: 'var(--tn-gray-900)', letterSpacing: '-0.01em' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--tn-gray-500)', marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
              </div>
              <i className="fas fa-arrow-right" style={{ position: 'absolute', right: 18, top: 18, color: 'var(--tn-gray-400)', fontSize: 11 }} />
            </Link>
          ))}
        </div>

        {/* ── Two columns: orders + manuscripts ── */}
        <div className="adm-grid-2" style={{ marginBottom: 36 }}>
          {/* Recent orders */}
          <AdminCard padding={0}>
            <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--tn-gray-200)' }}>
              <div>
                <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 17, fontWeight: 600, color: 'var(--tn-gray-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-clock" style={{ color: 'var(--tn-orange)', fontSize: 14 }} />
                  Commandes récentes
                </div>
                <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gray-500)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
                  {recentOrders.length} dernières
                </div>
              </div>
              <Link to="/admin-dashboard/orders" style={{ fontSize: 13, fontWeight: 600, color: 'var(--tn-orange)', textDecoration: 'none' }}>Voir tout →</Link>
            </div>
            {recentOrders.length === 0 ? (
              <div style={{ padding: '40px 22px', textAlign: 'center', color: 'var(--tn-gray-500)', fontSize: 14 }}>
                <i className="fas fa-inbox" style={{ fontSize: 24, opacity: 0.4, marginBottom: 8, display: 'block' }} />
                Aucune commande
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recentOrders.map((o, i) => {
                  const itemCount = (o.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
                  return (
                    <li key={o.id} className="adm-list-item" style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 22px',
                      borderTop: i > 0 ? '1px solid var(--tn-gray-200)' : 0,
                    }}>
                      <span className="adm-list-item-id" style={{ fontFamily: 'var(--tn-mono)', fontWeight: 700, fontSize: 12, color: 'var(--tn-gray-900)', minWidth: 50 }}>#{o.id}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tn-gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.user?.full_name || o.user?.username || 'Client'}</div>
                        <div style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 2 }}>{fmtDate(o.created_at)} · {itemCount} art.</div>
                      </div>
                      <StatusBadge value={(o.status || '').toLowerCase()} />
                      <span className="adm-list-item-amount" style={{ fontFamily: 'var(--tn-mono)', fontWeight: 700, fontSize: 12, color: 'var(--tn-gray-900)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {fmtPrice(o.total_amount)} <span style={{ fontSize: 9, color: 'var(--tn-gray-500)', fontWeight: 500 }}>F</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>

          {/* Recent manuscripts */}
          <AdminCard padding={0}>
            <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--tn-gray-200)' }}>
              <div>
                <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 17, fontWeight: 600, color: 'var(--tn-gray-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-feather" style={{ color: 'var(--tn-orange)', fontSize: 14 }} />
                  Manuscrits récents
                </div>
                <div style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gray-500)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
                  {recentManuscripts.length} derniers · {manuscriptStats.pending} à examiner
                </div>
              </div>
              <Link to="/admin-dashboard/manuscripts" style={{ fontSize: 13, fontWeight: 600, color: 'var(--tn-orange)', textDecoration: 'none' }}>Voir tout →</Link>
            </div>
            {recentManuscripts.length === 0 ? (
              <div style={{ padding: '40px 22px', textAlign: 'center', color: 'var(--tn-gray-500)', fontSize: 14 }}>
                <i className="fas fa-file-circle-question" style={{ fontSize: 24, opacity: 0.4, marginBottom: 8, display: 'block' }} />
                Aucun manuscrit soumis
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recentManuscripts.map((m, i) => (
                  <li key={m.id} className="adm-list-item" style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 22px',
                    borderTop: i > 0 ? '1px solid var(--tn-gray-200)' : 0,
                  }}>
                    <AdminAvatar name={m.author_name} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 14, fontWeight: 600, color: 'var(--tn-gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--tn-gray-500)', marginTop: 2 }}>{m.author_name} · {fmtDate(m.submitted_at)}</div>
                    </div>
                    <StatusBadge value={(m.status || '').toLowerCase()} />
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        {/* ── Catalogue indicators ── */}
        {bookStats && (
          <>
            <AdminSectionTitle
              icon="fa-chart-column"
              eyebrow="Composition"
              title="Indicateurs catalogue"
              action={<span style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gray-500)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Sur {bookStats.total_books} titres</span>}
            />
            <div className="adm-grid-cat">
              <AdminCard>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    ['Papier', bookStats.paper_books_count, '#E8601C'],
                    ['Ebooks', bookStats.ebooks_count, '#C8956C'],
                    ['En promotion', bookStats.books_with_discount, '#F4863F'],
                    ['Best-sellers', bookStats.bestsellers_count, '#2D2D2D'],
                  ].map(([label, count, color]) => {
                    const pct = bookStats.total_books > 0 ? Math.round((count / bookStats.total_books) * 100) : 0;
                    return (
                      <div key={label}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 14, color: 'var(--tn-gray-900)', fontWeight: 600 }}>{label}</span>
                          <span>
                            <span style={{ fontFamily: 'var(--tn-serif)', fontSize: 18, fontWeight: 700, color }}>{count}</span>
                            <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 11, color: 'var(--tn-gray-500)', marginLeft: 6 }}>{pct}%</span>
                          </span>
                        </div>
                        <div style={{ height: 8, background: 'var(--tn-cream-2)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AdminCard>

              <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 16 }}>
                <AdminStat dark icon="fa-tag" label="Prix moyen" value={fmtPrice(bookStats.average_price || 0)} suffix="FCFA" meta={bookStats.average_price > 0 ? 'Moyenne sur le catalogue' : 'Aucun livre'} />
                <AdminStat dark icon="fa-star" label="Note moyenne" value={Number(bookStats.average_rating || 0).toFixed(1)} suffix="/ 5" meta={bookStats.average_rating > 0 ? `Sur ${bookStats.total_books} livres` : 'Aucune note'} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

function PulseDot() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'var(--tn-success)', opacity: 0.5,
      }} />
      <span style={{
        position: 'relative', width: 10, height: 10, borderRadius: '50%',
        background: 'var(--tn-success)', boxShadow: '0 0 0 3px rgba(46,125,50,0.25)',
      }} />
    </span>
  );
}

export default AdminDashboard;
