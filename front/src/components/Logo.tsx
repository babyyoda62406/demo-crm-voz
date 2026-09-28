interface LogoProps {
  className?: string;
  title?: string;
}

/**
 * Logo de CRMIA: edificio + pin de ubicación, en azul de marca (blue-600).
 * SVG inline propio (sin dependencias ni imágenes externas).
 */
export const Logo = ({ className = 'w-9 h-9', title = 'CRMIA' }: LogoProps) => {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <rect x="0" y="0" width="64" height="64" rx="14" fill="#2563EB" />
      <path d="M14 50V22l14-8v36z" fill="#FFFFFF" fillOpacity="0.95" />
      <path d="M30 50V26l12 6v18z" fill="#FFFFFF" fillOpacity="0.7" />
      <rect x="18" y="26" width="4" height="4" rx="1" fill="#2563EB" />
      <rect x="18" y="34" width="4" height="4" rx="1" fill="#2563EB" />
      <rect x="18" y="42" width="4" height="4" rx="1" fill="#2563EB" />
      <path
        d="M45 14c-4.4 0-8 3.5-8 7.9 0 5.9 8 13.1 8 13.1s8-7.2 8-13.1c0-4.4-3.6-7.9-8-7.9z"
        fill="#FFFFFF"
      />
      <circle cx="45" cy="22" r="3" fill="#2563EB" />
    </svg>
  );
};
