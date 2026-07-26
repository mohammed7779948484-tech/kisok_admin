import { Cloudinary } from "@cloudinary/url-gen";
import { fill } from "@cloudinary/url-gen/actions/resize";
import { format, quality } from "@cloudinary/url-gen/actions/delivery";
import { auto } from "@cloudinary/url-gen/qualifiers/format";
import { auto as autoQuality } from "@cloudinary/url-gen/qualifiers/quality";
import { env } from "@/shared/env";

export const cloudinaryCloudName = env.VITE_CLOUDINARY_CLOUD_NAME ?? "kisok_store";
export const cloudinaryUploadPreset = env.VITE_CLOUDINARY_UPLOAD_PRESET ?? "";

export const cld = new Cloudinary({
  cloud: {
    cloudName: cloudinaryCloudName,
  },
});

export function cloudinarySquare(publicId: string, size = 400) {
  return cld
    .image(publicId)
    .resize(fill().width(size).height(size))
    .delivery(format(auto()))
    .delivery(quality(autoQuality()));
}
