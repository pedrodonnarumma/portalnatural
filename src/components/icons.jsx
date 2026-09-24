// Íconos de línea del diseño (trazados copiados del archivo de diseño). Toman `currentColor`.
function Svg({ size = 24, strokeWidth = 1.6, viewBox = '0 0 24 24', children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* — Interfaz — */
export const Sprout = (p) => (
  <Svg {...p}><path d="M12 3v18" /><path d="M12 9c0-3 2-5 5-5 0 3-2 5-5 5z" /><path d="M12 14c0-3-2-5-5-5 0 3 2 5 5 5z" /></Svg>
);
export const Leaf = (p) => (
  <Svg {...p}><path d="M20 4c0 8-5 13-13 13H4c0-8 5-13 13-13z" /><path d="M4 20c2-5 5-8 9-10" /></Svg>
);
export const BagCheck = (p) => (
  <Svg {...p}><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M9.5 13.5l1.8 1.8 3.4-3.4" /></Svg>
);
export const Bag = (p) => (
  <Svg {...p}><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Svg>
);
export const GlutenFree = (p) => (
  <Svg {...p}><path d="M21 12a8 8 0 1 1-3.1-6.3" /><path d="M8 12h8" /><path d="M12 8v8" /></Svg>
);
export const Chat = (p) => (
  <Svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-8.9A8.4 8.4 0 1 1 21 11.5z" /></Svg>
);
export const WhatsApp = (p) => (
  <Svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-8.9A8.4 8.4 0 1 1 21 11.5z" /><path d="M8.6 9.4c.4 2.8 3.2 5.6 6 6" /></Svg>
);
export const Check = (p) => <Svg strokeWidth={2.2} {...p}><path d="M20 6L9 17l-5-5" /></Svg>;
export const ArrowRight = (p) => <Svg strokeWidth={2} {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Svg>;
export const ArrowLeft = (p) => <Svg strokeWidth={2} {...p}><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></Svg>;
export const MapPin = (p) => (
  <Svg strokeWidth={1.7} {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></Svg>
);
export const Clock = (p) => <Svg strokeWidth={1.7} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const Phone = (p) => (
  <Svg strokeWidth={1.7} {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1.1 1A16 16 0 0 1 4 5.1 1 1 0 0 1 5 4z" /></Svg>
);
export const Menu = (p) => <Svg strokeWidth={1.8} {...p}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Svg>;
export const Close = (p) => <Svg strokeWidth={1.9} {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></Svg>;
export const Search = (p) => <Svg strokeWidth={1.8} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" /></Svg>;
export const Minus = (p) => <Svg strokeWidth={2.2} {...p}><path d="M5 12h14" /></Svg>;
export const Plus = (p) => <Svg strokeWidth={2.2} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>;

/* — Miniaturas de producto (thumbs del catálogo) — */
const thumbs = {
  almendra: <><ellipse cx="12" cy="9" rx="5" ry="6" /><path d="M12 15v6" /></>,
  bolsa: <><path d="M5 9h14l-1.4 10.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  frasco: <><path d="M8 3h8l-1 4H9z" /><path d="M9 7h6l1.5 12a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z" /></>,
  brote: <><path d="M12 3v18" /><path d="M12 8c0-3 2-5 5-5 0 3-2 5-5 5z" /><path d="M12 14c0-3-2-5-5-5 0 3 2 5 5 5z" /></>,
  harina: <><path d="M4 18h16" /><path d="M6 18V9a6 6 0 0 1 12 0v9" /><path d="M9 9h6" /></>,
  semilla: <><circle cx="12" cy="12" r="8" /><path d="M12 4v16" /><path d="M4 12h16" /></>,
  suplemento: <><rect x="7" y="4" width="10" height="16" rx="3" /><path d="M10 9h4" /></>,
  aceite: <><path d="M6 20V8a6 6 0 0 1 12 0v12z" /><path d="M9 12h6" /></>,
  hoja: <><path d="M20 4c0 8-5 13-13 13H4c0-8 5-13 13-13z" /><path d="M4 20c2-5 5-8 9-10" /></>,
};
export function ProductIcon({ name = 'hoja', ...p }) {
  return <Svg strokeWidth={1.3} {...p}>{thumbs[name] ?? thumbs.hoja}</Svg>;
}

/* — Ilustraciones de los placeholders de foto — */
export function HeroSprout({ size = 420 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" stroke="var(--pn-sprout)" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M100 178V58" />
      <path d="M100 96c0-22 16-40 40-42-2 24-18 42-40 42z" />
      <path d="M100 126c0-22-16-40-40-42 2 24 18 42 40 42z" />
      <path d="M100 66c0-16 12-30 30-32-2 18-14 32-30 32z" />
      <circle cx="100" cy="100" r="78" stroke="var(--pn-sprout-ring)" />
    </svg>
  );
}
export function SmallSprout({ size = 260, ground = true, leaves = 2, strokeWidth = 1.3 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" stroke="var(--pn-sprout)" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true">
      <path d="M60 104V36" />
      <path d="M60 60c0-14 10-25 25-26-1 15-11 26-25 26z" />
      {leaves > 1 && <path d="M60 82c0-14-10-25-25-26 1 15 11 26 25 26z" />}
      {ground && <path d="M24 104h72" />}
    </svg>
  );
}
