interface VenueMapProps {
  address: string;
  className?: string;
}

export function VenueMap({ address, className = "" }: VenueMapProps) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=15`;
  return (
    <div className={`w-full overflow-hidden bg-gray-100 ${className}`}>
      <iframe
        title="Venue location"
        src={src}
        width="100%"
        height="100%"
        frameBorder="0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-full border-0"
      />
    </div>
  );
}
