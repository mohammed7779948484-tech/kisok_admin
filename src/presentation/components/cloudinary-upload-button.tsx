import { useEffect, useRef, useState } from "react";
import { ImagePlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { CloudinaryAsset } from "@/domain/media";
import {
  cloudinaryCloudName,
  cloudinaryUploadPreset,
} from "@/infrastructure/cloudinary/config";

type CloudinaryUploadInfo = {
  asset_id?: string;
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  created_at?: string;
};

type UploadWidget = {
  open: () => void;
  destroy?: () => void;
};

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget?: (
        options: Record<string, unknown>,
        callback: (error: unknown, result: unknown) => void,
      ) => UploadWidget;
    };
  }
}

function toAsset(info: CloudinaryUploadInfo): CloudinaryAsset {
  return {
    id: info.asset_id,
    publicId: info.public_id,
    secureUrl: info.secure_url,
    width: info.width,
    height: info.height,
    format: info.format,
    bytes: info.bytes,
    createdAt: info.created_at,
    source: "library",
  };
}

export function CloudinaryUploadButton({
  folder = "kiosk-admin",
  onUploaded,
}: {
  folder?: string;
  onUploaded: (asset: CloudinaryAsset) => Promise<void> | void;
}) {
  const widgetRef = useRef<UploadWidget | null>(null);
  const onUploadedRef = useRef(onUploaded);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    onUploadedRef.current = onUploaded;
  }, [onUploaded]);

  useEffect(() => {
    if (!cloudinaryUploadPreset) return;
    setReady(false);
    setTimedOut(false);

    const intervalId = window.setInterval(() => {
      if (typeof window.cloudinary?.createUploadWidget !== "function") return;

      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName: cloudinaryCloudName,
          uploadPreset: cloudinaryUploadPreset,
          folder,
          multiple: false,
          maxFiles: 1,
          maxFileSize: 10_000_000,
          clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "avif"],
          sources: ["local", "url"],
          resourceType: "image",
        },
        (error, result) => {
          if (error) {
            toast.error("Cloudinary upload failed.");
            return;
          }

          const event = result as { event?: string; info?: CloudinaryUploadInfo };
          if (event.event === "success" && event.info?.public_id && event.info.secure_url) {
            void Promise.resolve(onUploadedRef.current(toAsset(event.info)))
              .then(() => toast.success("Image uploaded and added to Media."))
              .catch((uploadError) => {
                toast.error(
                  uploadError instanceof Error
                    ? uploadError.message
                    : "The image uploaded, but could not be added to Media.",
                );
              });
          }
        },
      );
      setReady(true);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    }, 100);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      setTimedOut(true);
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      widgetRef.current?.destroy?.();
      widgetRef.current = null;
    };
  }, [folder]);

  const disabled = !cloudinaryUploadPreset || timedOut || !ready;

  return (
    <Button
      disabled={disabled}
      onClick={() => widgetRef.current?.open()}
      title={!cloudinaryUploadPreset ? "Set VITE_CLOUDINARY_UPLOAD_PRESET first" : undefined}
      type="button"
    >
      {!cloudinaryUploadPreset || (!ready && !timedOut) ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <ImagePlusIcon data-icon="inline-start" />
      )}
      Upload image
    </Button>
  );
}
