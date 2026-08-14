import { useEffect, useState } from "react";
import { AdvancedImage, lazyload, placeholder, responsive } from "@cloudinary/react";
import { cloudinaryContained, cloudinarySquare } from "@/infrastructure/cloudinary/config";

export function CloudinaryImage({
  publicId,
  secureUrl,
  alt,
  className,
  size = 400,
  fit = "cover",
}: {
  publicId?: string | null;
  secureUrl?: string | null;
  alt: string;
  className?: string;
  size?: number;
  fit?: "cover" | "contain";
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
        cldImg={fit === "contain" ? cloudinaryContained(publicId, size) : cloudinarySquare(publicId, size)}
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
