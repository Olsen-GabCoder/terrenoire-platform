import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import BookCard from '../components/BookCard';
import '../styles/Wishlist.css';
import PageHero from '../components/ui/PageHero';
import EmptyState from '../components/ui/EmptyState';

const Wishlist = () => {
  const { wishlistItems, removeFromWishlist, isInWishlist } = useWishlist();

  if (!wishlistItems.length) {
    return (
      <div className="wishlist-page">
        <PageHero compact title="Ma liste" accent="d'envie" subtitle="Votre liste d'envie est vide." />

        <div className="wishlist-content">
          <EmptyState
            icon="fa-heart"
            title="Pas encore de pages élues"
            text="Les livres que vous aimez méritent un lieu à part. Touchez le cœur d'un ouvrage pour en faire l'un de vos favoris."
          >
            <Link to="/catalog" className="tn-btn tn-btn--primary tn-btn--lg">
              <i className="fas fa-book-open" /> Explorer le catalogue
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <PageHero
        compact
        title="Ma liste"
        accent="d'envie"
        subtitle={`${wishlistItems.length} livre${wishlistItems.length > 1 ? 's' : ''} dans votre liste`}
      />

      <div className="wishlist-content">
        <div className="wishlist-grid">
          {wishlistItems.map((book) => (
            <div key={book.id} className="wishlist-card-wrapper">
              <BookCard book={book} />
              <div className="wishlist-card-actions">
                <button
                  type="button"
                  className="wishlist-remove"
                  onClick={() => removeFromWishlist(book.id)}
                  aria-label="Retirer de la liste d'envie"
                >
                  <i className="fas fa-heart-broken" />
                  Retirer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
