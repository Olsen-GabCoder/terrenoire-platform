import React from 'react';
import { shade } from './shade';

/**
 * Couverture de remplacement quand un livre n'a pas d'image.
 * variant="compact" : vignette (panier, commandes, récapitulatif) — initiale seule.
 */
export default function TnBookCover({ book = {}, style, variant }) {
  const accent = book.accent || '#7a3a1c';
  const collection = book.collection
    || (typeof book.category === 'object' ? book.category?.name : book.category)
    || 'Terre Noire';
  const authorName = typeof book.author === 'object' ? book.author?.full_name : book.author;
  const background = `linear-gradient(155deg, ${accent} 0%, ${shade(accent, -28)} 100%)`;

  if (variant === 'compact') {
    return (
      <div aria-hidden="true" style={{
        width: '100%', height: '100%', background,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fbf3e3', fontFamily: "'Playfair Display', serif",
        fontWeight: 700, fontSize: 'clamp(16px, 40%, 28px)', position: 'relative',
        ...style,
      }}>
        {(book.title || '?').trim().charAt(0).toUpperCase()}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'rgba(0,0,0,0.25)' }} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%', height: '100%',
      background,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      padding: '14px 12px 16px',
      color: '#fbf3e3',
      overflow: 'hidden',
      ...style,
    }}>
      {/* Ornement centré (le coin supérieur est réservé aux badges et au bouton favori) */}
      <svg style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.35 }} width="34" height="34" viewBox="0 0 22 22" aria-hidden="true">
        <path d="M0 11 L11 0 L22 11 L11 22 Z" fill="none" stroke="#fbf3e3" strokeWidth="0.8" />
        <circle cx="11" cy="11" r="2" fill="#fbf3e3" />
      </svg>

      <div style={{
        fontFamily: 'var(--tn-mono)', fontSize: 8, letterSpacing: '0.18em',
        textTransform: 'uppercase', opacity: 0.7, marginBottom: 6,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {collection}
      </div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 17, lineHeight: 1.1, fontWeight: 700,
        marginBottom: 8, textWrap: 'balance',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{book.title}</div>
      {authorName && (
        <div style={{
          fontFamily: 'var(--tn-mono)', fontSize: 9,
          letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{authorName}</div>
      )}

      <div style={{
        position: 'absolute', left: 12, bottom: 8, right: 12,
        height: 2, background: 'rgba(255,255,255,0.25)',
      }} />
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: 'rgba(0,0,0,0.25)',
      }} />
    </div>
  );
}
