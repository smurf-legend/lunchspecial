// Every special shows an image slot, even without an uploaded photo — a
// plain text listing reads as stale/abandoned next to ones with photos.
export default function SpecialImage({
  src,
  alt,
  className = "",
  iconClassName = "text-3xl",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} />
    );
  }

  return (
    <div
      role="img"
      aria-label={`No photo yet for ${alt}`}
      className={`flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 text-orange-300 ${className}`}
    >
      <span className={iconClassName}>🍽️</span>
    </div>
  );
}
