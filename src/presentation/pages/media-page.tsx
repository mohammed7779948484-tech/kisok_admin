import { useState } from "react";
import { useInvalidate } from "@refinedev/core";
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CloudinaryImage } from "@/presentation/components/cloudinary-image";
import { CloudinaryUploadButton } from "@/presentation/components/cloudinary-upload-button";
import { saveMediaAsset, useMediaAssets } from "@/presentation/hooks/use-media-assets";
import { deleteCloudinaryAsset } from "@/infrastructure/cloudinary/media-gateway";
import { PageHeader } from "@/presentation/components/page-header";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";
import { toAppError } from "@/shared/errors";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/presentation/hooks/use-debounced-value";

export function MediaPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 48;
  const deferredSearch = useDebouncedValue(search.trim(), 300);
  const { assets, error, isLoading, total } = useMediaAssets({
    page,
    pageSize,
    search: deferredSearch,
  });
  const invalidate = useInvalidate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (publicId: string) => {
    if (!confirm(`Are you sure you want to delete "${publicId}"?`)) return;
    setDeletingId(publicId);
    try {
      await deleteCloudinaryAsset(publicId);
      await invalidate({ resource: "media_assets", invalidates: ["list"] });
      toast.success("Image deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete image.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PageHeader
        actions={
          <CloudinaryUploadButton
            onUploaded={async (asset) => {
              await saveMediaAsset(asset);
              await invalidate({ resource: "media_assets", invalidates: ["list"] });
            }}
          />
        }
        description="Upload Cloudinary images once, then reuse them in brands, products, categories, and flavors."
        title="Media"
      />
      {isLoading ? <TableSkeleton /> : null}
      {error ? <ErrorState message={toAppError(error).message} /> : null}
      {!isLoading && !assets.length ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          No media yet. Upload the first image to start building the library.
        </div>
      ) : null}
      <Input
        aria-label="Search media"
        className="max-w-sm"
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder="Search Cloudinary public ID..."
        value={search}
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {assets.map((asset) => (
          <div className="group overflow-hidden rounded-md border bg-card" key={asset.publicId}>
            <CloudinaryImage
              alt={asset.publicId}
              className="aspect-square w-full object-cover"
              publicId={asset.publicId}
              secureUrl={asset.secureUrl}
            />
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">Media library</Badge>
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
                  <Button
                    aria-label="Delete image"
                    disabled={deletingId === asset.publicId}
                    onClick={() => void handleDelete(asset.publicId)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    {deletingId === asset.publicId ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <Trash2Icon className="text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="truncate text-xs text-muted-foreground" data-testid="media-public-id">
                {asset.publicId}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{total} media item(s)</p>
        <div className="flex items-center gap-2">
          <Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} size="icon" variant="outline">
            <ChevronLeftIcon />
          </Button>
          <span className="text-sm">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
          <Button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((value) => value + 1)} size="icon" variant="outline">
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </>
  );
}
