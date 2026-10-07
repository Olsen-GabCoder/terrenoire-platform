import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import BookCard from '../components/BookCard';
import { TnPlaceholder } from '../components/ui';
import LoadingSpinner from '../components/LoadingSpinner';
import bookService from '../services/bookService';
import '../styles/AuthorDetail.css';

const AuthorDetail = () => {
  const { id } = useParams();
  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [authorData, booksData] = await Promise.all([
          bookService.getAuthorById(id),
          bookService.getAuthorBooks(id),
        ]);
        setAuthor(authorData);
        setBooks(Array.isArray(booksData) ? booksData : booksData.results || []);
      } catch (err) {
        setError('Auteur non trouvé');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner fullPage />;

  if (error || !author) {
    return (
      <div className="authd-page">
        <section className="authd-hero">
          <div className="authd-hero__inner">
            <h1 className="authd-hero__name">Auteur non trouvé</h1>
            <p style={{ color: 'var(--tn-gray-400)', marginTop: 12 }}>{error || "Cet auteur n'existe pas."}</p>
            <Link to="/authors" className="tn-btn tn-btn--outline-light" style={{ marginTop: 24 }}>
              <i className="fas fa-arrow-left" /> Retour aux auteurs
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const initial = (author.full_name || '?').charAt(0).toUpperCase();
  const nameParts = (author.full_name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return (
    <div className="authd-page">
      {/* ── HERO ── */}
      <section className="authd-hero">
        <div className="tn-motif-bg authd-hero__motif" />
        <div className="authd-hero__orb" />

        <div className="authd-hero__inner">
          {/* Portrait */}
          <div className="authd-hero__portrait">
            {author.photo ? (
              <img src={author.photo} alt={author.full_name} loading="lazy" />
            ) : (
              <TnPlaceholder kind="cover" label="PORTRAIT AUTEUR" style={{ width: '100%', height: '100%' }}>
                <span className="authd-hero__portrait-initial">{initial}</span>
              </TnPlaceholder>
            )}
          </div>

          {/* Info */}
          <div className="authd-hero__info">
            <div className="authd-hero__breadcrumb">
              <Link to="/authors">Auteurs</Link> / {author.full_name}
            </div>
            <h1 className="authd-hero__name">
              {firstName}<br />
              {lastName && <span className="authd-hero__name-accent">{lastName}</span>}
            </h1>
            <div className="authd-hero__pills">
              {books.length > 0 && <span className="tn-pill tn-pill--solid">{books.length} ouvrage{books.length > 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>

      </section>
      <div className="tn-motif-strip" style={{ opacity: 0.6 }} aria-hidden="true" />

      {/* ── BIO + SIDEBAR ── */}
      {author.biography && (
        <section className="authd-bio-section">
          <div className="authd-bio">
            <span className="authd-bio__label">Biographie</span>
            <div className="authd-bio__text">
              <p>
                <span className="authd-bio__dropcap">{author.biography.charAt(0)}</span>
                {author.biography.slice(1)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── BIBLIOGRAPHY ── */}
      <section className="authd-books">
        <div className="authd-books__header">
          <h2 className="authd-books__title tn-section-title">Bibliographie</h2>
          <span className="authd-books__count">{books.length} ouvrage{books.length > 1 ? 's' : ''}</span>
        </div>

        {books.length === 0 ? (
          <div className="authd-books__empty">
            <h3>Les œuvres de cet auteur sont encore en attente</h3>
            <p>Cet auteur n&apos;a pas encore d&apos;ouvrage publié sur Terre Noire. Revenez bientôt — l&apos;écriture suit son cours.</p>
          </div>
        ) : (
          <div className="authd-books__grid">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AuthorDetail;
