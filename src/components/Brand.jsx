// Logo (la puerta) + nombre. size: 'lg' nav escritorio · 'md' footer escritorio / nav móvil · 'sm' footer móvil / panel.
export default function Brand({ size = 'lg', as: Tag = 'span', className = '', ...props }) {
  return (
    <Tag className={`pn-brand pn-brand-${size} ${className}`} {...props}>
      <img className="pn-brand-logo" src="/logo.jpg" alt="" width="42" height="42" />
      <span className="pn-brand-name">Portal Natural</span>
    </Tag>
  );
}
