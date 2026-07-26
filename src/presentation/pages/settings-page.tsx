import { useEffect, useState } from "react";
import { useList, useUpdate } from "@refinedev/core";
import { ImageIcon, SaveIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { StoreSettings } from "@/domain/entities";
import { toAppError } from "@/shared/errors";
import { PageHeader } from "@/presentation/components/page-header";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";
import { CloudinaryImage } from "@/presentation/components/cloudinary-image";
import { MediaPicker } from "@/presentation/components/media-picker";

export function SettingsPage() {
  const settings = useList<StoreSettings>({
    resource: "store_settings",
    pagination: { mode: "off" },
  });
  const update = useUpdate<StoreSettings>();
  const record = settings.result.data[0];
  const [form, setForm] = useState<Partial<StoreSettings>>({});
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    if (record) setForm(record);
  }, [record]);

  const save = async () => {
    const logoId = form.logo_public_id?.trim() || null;
    const logoUrl = form.logo_secure_url?.trim() || null;
    if (
      !form.store_name?.trim() ||
      !form.store_timezone?.trim() ||
      Number(form.global_low_stock_threshold) < 0 ||
      Number(form.customer_success_reset_seconds) <= 0
    ) {
      toast.error("Store name, timezone, and valid numeric values are required.");
      return;
    }
    if (Boolean(logoId) !== Boolean(logoUrl) || (logoUrl && !logoUrl.startsWith("https://"))) {
      toast.error("Logo requires both a public ID and an HTTPS URL.");
      return;
    }
    try {
      Intl.DateTimeFormat(undefined, { timeZone: form.store_timezone }).format();
    } catch {
      toast.error("Enter a valid IANA timezone, such as America/Los_Angeles.");
      return;
    }
    try {
      await update.mutateAsync({
        resource: "store_settings",
        id: "true",
        values: {
          store_name: form.store_name.trim(),
          logo_public_id: logoId,
          logo_secure_url: logoUrl,
          global_low_stock_threshold: Number(form.global_low_stock_threshold),
          customer_success_reset_seconds: Number(
            form.customer_success_reset_seconds,
          ),
          store_timezone: form.store_timezone.trim(),
        },
      });
      toast.success("Store settings saved.");
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  return (
    <>
      <PageHeader
        description="Global kiosk behavior, stock threshold, timezone, and store identity."
        title="Store settings"
      />
      {settings.query.isLoading ? <TableSkeleton /> : null}
      {settings.query.error ? (
        <ErrorState message={toAppError(settings.query.error).message} />
      ) : null}
      {record ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>General settings</CardTitle>
            <CardDescription>
              Changes apply to the single configured store.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="store-name">Store name</FieldLabel>
                <Input
                  id="store-name"
                  onChange={(event) =>
                    setForm({ ...form, store_name: event.target.value })
                  }
                  value={form.store_name ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="store-timezone">Store timezone</FieldLabel>
                <Input
                  id="store-timezone"
                  onChange={(event) =>
                    setForm({ ...form, store_timezone: event.target.value })
                  }
                  placeholder="America/Los_Angeles"
                  value={form.store_timezone ?? ""}
                />
                <FieldDescription>Use a valid IANA timezone name.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="stock-threshold">
                  Global low-stock threshold
                </FieldLabel>
                <Input
                  id="stock-threshold"
                  min={0}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      global_low_stock_threshold: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={form.global_low_stock_threshold ?? 0}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="success-reset">
                  Customer success reset (seconds)
                </FieldLabel>
                <Input
                  id="success-reset"
                  min={1}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customer_success_reset_seconds: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={form.customer_success_reset_seconds ?? 1}
                />
              </Field>
              <Field>
                <FieldLabel>Store logo</FieldLabel>
                {form.logo_secure_url ? (
                  <CloudinaryImage
                    alt="Store logo preview"
                    className="mt-2 aspect-video w-full rounded-lg border object-contain"
                    publicId={form.logo_public_id}
                    secureUrl={form.logo_secure_url}
                    size={640}
                  />
                ) : null}
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => setMediaPickerOpen(true)} type="button" variant="outline">
                    <ImageIcon data-icon="inline-start" />
                    Select from media
                  </Button>
                  {form.logo_secure_url ? (
                    <Button
                      onClick={() =>
                        setForm({ ...form, logo_public_id: null, logo_secure_url: null })
                      }
                      type="button"
                      variant="ghost"
                    >
                      <XIcon data-icon="inline-start" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Button disabled={update.mutation.isPending} onClick={save}>
                {update.mutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                {update.mutation.isPending ? "Saving..." : "Save settings"}
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      ) : null}
      <MediaPicker
        onOpenChange={setMediaPickerOpen}
        onSelect={(assets) => {
          const asset = assets[0];
          if (!asset) return;
          setForm({
            ...form,
            logo_public_id: asset.publicId,
            logo_secure_url: asset.secureUrl,
          });
        }}
        open={mediaPickerOpen}
        selectedPublicId={form.logo_public_id ?? undefined}
      />
    </>
  );
}
