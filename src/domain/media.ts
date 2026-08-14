export interface CloudinaryAsset {
  id?: string;
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  createdAt?: string;
  bytes?: number;
  source: "library";
}
