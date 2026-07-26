import { CopyIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CloudinaryImage } from "@/presentation/components/cloudinary-image";
import { CloudinaryUploadButton } from "@/presentation/components/cloudinary-upload-button";
import {
  addMediaAsset,
  removeMediaAsset,
  useMediaAssets,
} from "@/presentation/hooks/use-media-assets";
import { PageHeader } from "@/presentation/components/page-header";
import { TableSkeleton } from "@/presentation/components/states";

export function MediaPage() {
  const { assets, isLoading } = useMediaAssets();

  return (
    <>
      <PageHeader
        actions={<CloudinaryUploadButton onUploaded={addMediaAsset} />}
        description="Upload Cloudinary images once, then reuse them in brands, products, categories, and flavors."
        title="Media"
      />
      {isLoading ? <TableSkeleton /> : null}
      {!isLoading && !assets.length ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          No media yet. Upload the first image to start building the library.
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {assets.map((asset) => (
          <div className="group overflow-hidden rounded-md border bg-card" key={asset.publicId}>
            <CloudinaryImage
              alt={asset.publicId}
              className="aspect-square w-full object-cover"
              publicId={asset.publicId}
              secureUrl={asset.secureUrl}
            />
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={asset.source === "uploaded" ? "default" : "secondary"}>
                  {asset.source}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    aria-label="Copy Cloudinary URL"
                    onClick={() => {
                      void navigator.clipboard.writeText(asset.secureUrl);
                      toast.success("Image URL copied.");
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <CopyIcon />
                  </Button>
                  {asset.source === "uploaded" ? (
                    <Button
                      aria-label="Remove from local media library"
                      onClick={() => removeMediaAsset(asset.publicId)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2Icon />
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="truncate text-xs text-muted-foreground">{asset.publicId}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

