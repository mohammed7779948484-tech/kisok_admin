import { AdvancedImage, lazyload, placeholder, responsive } from "@cloudinary/react";
import { cloudinarySquare } from "@/infrastructure/cloudinary/config";

export function CloudinaryImage({
  publicId,
  secureUrl,
  alt,
  className,
  size = 400,
}: {
  publicId?: string | null;
  secureUrl?: string | null;
  alt: string;
  className?: string;
  size?: number;
}) {
  if (publicId) {
    return (
      <AdvancedImage
        alt={alt}
        className={className}
        cldImg={cloudinarySquare(publicId, size)}
        height={size}
        plugins={[responsive(), placeholder({ mode: "blur" }), lazyload()]}
        width={size}
      />
    );
  }

  if (secureUrl) {
    return <img alt={alt} className={className} src={secureUrl} />;
  }

  return <div aria-label={alt} className={className} />;
}

