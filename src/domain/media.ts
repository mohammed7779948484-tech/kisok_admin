export interface CloudinaryAsset {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  createdAt?: string;
  source: "cloudinary" | "catalog" | "uploaded";
}

