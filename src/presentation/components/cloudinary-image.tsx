import { useEffect, useState } from "react";
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
  const [publicIdFailed, setPublicIdFailed] = useState(false);

  useEffect(() => {
    setPublicIdFailed(false);
  }, [publicId]);

  if (publicId && !publicIdFailed) {
    return (
      <AdvancedImage
        alt={alt}
        className={className}
        cldImg={cloudinarySquare(publicId, size)}
        height={size}
        plugins={[responsive(), placeholder({ mode: "blur" }), lazyload()]}
        onError={() => setPublicIdFailed(true)}
        width={size}
      />
    );
  }

  if (secureUrl) {
    return <img alt={alt} className={className} src={secureUrl} />;
  }

  return <div aria-label={alt} className={className} />;
}
