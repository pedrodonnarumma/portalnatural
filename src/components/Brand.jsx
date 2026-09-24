export default function Brand({ size = 'md', as: Tag = 'span', className = '', ...props }) {
  return (
    <Tag className={`brand brand-${size} ${className}`} {...props}>
      <span className="brand-mark" aria-hidden="true">P</span>
      <span className="brand-word">Portal Natural</span>
    </Tag>
  );
}
