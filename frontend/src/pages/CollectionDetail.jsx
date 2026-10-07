import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import BookCard from '../components/BookCard';
import { TnPlaceholder } from '../components/ui';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import '../styles/CollectionDetail.css';

const CollectionDetail = () => {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get(`/collections/by-slug/${slug}/`);
        setCollection(data);
        setBooks(Array.isArray(data.books) ? data.books : []);
      } catch (err) {
        setError('Collection non trouvée');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  if (loading) return <LoadingSpinner fullPage />;

  if (error || !collection) {
    return (
      <div className="coll-page">
        <section className="coll-hero">
          <div className="coll-hero__inner">
            <h1 className="coll-hero__name">Collection non trouvée</h1>
            <p style={{ color: 'var(--tn-gray-400)', marginTop: 12 }}>{error || "Cette collection n'existe pas."}</p>
            <Link to="/catalog" className="tn-btn tn-btn--outline-light" style={{ marginTop: 24 }}>
              <i className="fas fa-arrow-left" /> Retour au catalogue
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const initial = (collection.name || '?').charAt(0).toUpperCase();

  return (
    <div className="coll-page">
      {/* -- HERO -- */}
      <section className="coll-hero">
        <div className="tn-motif-bg coll-hero__motif" />
        <div className="coll-hero__orb" />

        <div className="coll-hero__inner">
          {/* Cover */}
          <div className="coll-hero__cover">
            {collection.cover_image ? (
              <img src={collection.cover_image} alt={collection.name} loading="lazy" />
            ) : (
              <TnPlaceholder kind="cover" label="COLLECTION" style={{ width: '100%', height: '100%' }}>
                <span className="coll-hero__cover-initial">{initial}</span>
              </TnPlaceholder>
            )}
          </div>

          {/* Info */}
          <div className="coll-hero__info">
            <div className="coll-hero__breadcrumb">
              <Link to="/catalog">Catalogue</Link> / Collections / {collection.name}
            </div>
            <h1 className="coll-hero__name">{collection.name}</h1>
            <div className="coll-hero__pills">
              {books.length > 0 && <span className="tn-pill tn-pill--solid">{books.length} ouvrage{books.length > 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>

      </section>
      <div className="tn-motif-strip" style={{ opacity: 0.6 }} aria-hidden="true" />

      {/* -- DESCRIPTION -- */}
      {collection.description && (
        <section className="coll-desc-section">
          <div className="coll-desc">
            <span className="coll-desc__label">Description</span>
            <div className="coll-desc__text">
              <p>
                <span className="coll-desc__dropcap">{collection.description.charAt(0)}</span>
                {collection.description.slice(1)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* -- BOOKS -- */}
      <section className="coll-books">
        <div className="coll-books__header">
          <h2 className="coll-books__title tn-section-title">Ouvrages de la collection</h2>
          <span className="coll-books__count">{books.length} ouvrage{books.length > 1 ? 's' : ''}</span>
        </div>

        {books.length === 0 ? (
          <div className="coll-books__empty">
            <h3>Cette collection attend ses premiers ouvrages</h3>
            <p>Aucun livre n&apos;est encore rattaché à cette collection. Revenez bientôt — le catalogue s&apos;enrichit au fil du temps.</p>
          </div>
        ) : (
          <div className="coll-books__grid">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CollectionDetail;
