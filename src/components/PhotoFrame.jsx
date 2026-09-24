// Marco de foto del diseño: fondo verde claro con una ilustración de brote y una etiqueta.
// Con `src`, muestra la foto real dentro del mismo marco.
export default function PhotoFrame({ src, alt = '', label, className = '', children }) {
  return (
    <div className={`pn-frame ${className}`}>
      {src ? <img className="pn-frame-img" src={src} alt={alt} loading="lazy" /> : children}
      {!src && label && <span className="pn-frame-label">{label}</span>}
    </div>
  );
}
