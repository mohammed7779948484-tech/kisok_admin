import { useMemo, useState } from "react";
import { CheckIcon, ImagesIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CloudinaryImage } from "@/presentation/components/cloudinary-image";
import { CloudinaryUploadButton } from "@/presentation/components/cloudinary-upload-button";
import { addMediaAsset, useMediaAssets } from "@/presentation/hooks/use-media-assets";
import type { CloudinaryAsset } from "@/domain/media";
import { toAppError } from "@/shared/errors";

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  selectedPublicId,
  multiple = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (assets: CloudinaryAsset[]) => void;
  selectedPublicId?: string;
  multiple?: boolean;
}) {
  const { assets, error, isLoading } = useMediaAssets();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filteredAssets = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return assets;
    return assets.filter((asset) => asset.publicId.toLowerCase().includes(value));
  }, [assets, query]);

  const currentSelection = selected.length ? selected : selectedPublicId ? [selectedPublicId] : [];

  const toggle = (publicId: string) => {
    if (!multiple) {
      setSelected([publicId]);
      return;
    }
    setSelected((previous) =>
      previous.includes(publicId)
        ? previous.filter((item) => item !== publicId)
        : [...previous, publicId],
    );
  };

  const confirm = () => {
    const picked = assets.filter((asset) => currentSelection.includes(asset.publicId));
    onSelect(picked);
    setSelected([]);
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex h-[82vh] w-[94vw] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>Select media</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by Cloudinary public ID..."
            value={query}
          />
          <CloudinaryUploadButton
            onUploaded={(asset) => {
              addMediaAsset(asset);
              setSelected([asset.publicId]);
            }}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border p-3">
          {error ? (
            <div className="flex h-full items-center justify-center text-sm text-destructive">
              {toAppError(error).message}
            </div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading media...
            </div>
          ) : filteredAssets.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredAssets.map((asset) => {
                const isSelected = currentSelection.includes(asset.publicId);
                return (
                  <button
                    className={`group relative overflow-hidden rounded-md border bg-card text-left transition ${
                      isSelected ? "ring-2 ring-primary" : "hover:border-primary/50"
                    }`}
                    key={asset.publicId}
                    onClick={() => toggle(asset.publicId)}
                    type="button"
                  >
                    <CloudinaryImage
                      alt={asset.publicId}
                      className="aspect-square w-full object-cover"
                      publicId={asset.publicId}
                      secureUrl={asset.secureUrl}
                    />
                    <span className="block truncate px-2 py-2 text-xs text-muted-foreground">
                      {asset.publicId}
                    </span>
                    {isSelected ? (
                      <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                        <CheckIcon className="size-4" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <ImagesIcon className="size-8" />
              No media found. Upload an image to add it to the library.
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            onClick={() => {
              setSelected([]);
              onOpenChange(false);
            }}
            type="button"
            variant="outline"
          >
            <XIcon data-icon="inline-start" />
            Cancel
          </Button>
          <Button disabled={!currentSelection.length} onClick={confirm} type="button">
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
