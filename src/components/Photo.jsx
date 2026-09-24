import { ImageIcon } from 'lucide-react';

// Foto con tratamiento `.washed`. Sin `src`, muestra un placeholder con la descripción.
export default function Photo({ src, alt, placeholder, className = '', ratio, position, eager = false }) {
  return (
    <figure className={`washed photo ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{ aspectRatio: ratio, objectPosition: position }}
          loading={eager ? 'eager' : 'lazy'}
        />
      ) : (
        <div className="photo-placeholder" style={{ aspectRatio: ratio }} role="img" aria-label={placeholder}>
          <ImageIcon size={28} strokeWidth={2} aria-hidden="true" />
          <span>{placeholder}</span>
        </div>
      )}
    </figure>
  );
}
