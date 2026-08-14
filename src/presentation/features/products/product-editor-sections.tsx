import { useState } from "react";
import { CameraIcon, ImageIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Brand, Category } from "@/domain/entities";
import { CloudinaryImage } from "@/presentation/components/cloudinary-image";
import { emptyFlavor, type ProductFlavorForm, type ProductForm } from "@/presentation/features/products/product-form-model";

export function BasicInfoSection({
  form,
  brands,
  readonly,
  onChange,
  onPickImage,
}: {
  form: ProductForm;
  brands: Brand[];
  readonly: boolean;
  onChange: (form: ProductForm) => void;
  onPickImage: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Name, brand, image, ordering, and product copy.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="product-name">Product Name</FieldLabel>
            <Input
              disabled={readonly}
              id="product-name"
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="e.g. GeekBar Pulse"
              value={form.name}
            />
          </Field>
          <Field>
            <FieldLabel>Brand</FieldLabel>
            <Select
              items={brands.map((brand) => ({ label: brand.name, value: brand.id }))}
              onValueChange={(value) => onChange({ ...form, brand_id: String(value) })}
              value={form.brand_id}
            >
              <SelectTrigger disabled={readonly}>
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="product-order">Sort Order</FieldLabel>
              <Input
                disabled={readonly}
                id="product-order"
                min={0}
                onChange={(event) =>
                  onChange({ ...form, display_order: Number(event.target.value) })
                }
                type="number"
                value={form.display_order}
              />
            </Field>
            <Field orientation="horizontal">
              <div className="flex flex-1 flex-col gap-1">
                <FieldLabel htmlFor="product-active">Active</FieldLabel>
                <FieldDescription>Visible in customer flows.</FieldDescription>
              </div>
              <Switch
                checked={form.is_active}
                disabled={readonly}
                id="product-active"
                onCheckedChange={(checked) => onChange({ ...form, is_active: checked })}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Main Image</FieldLabel>
            <div className="rounded-lg border p-3">
              {form.cover_secure_url ? (
                <div className="relative overflow-hidden rounded-md border">
                  <CloudinaryImage
                    alt="Product cover"
                    className="aspect-video w-full object-cover"
                    publicId={form.cover_public_id}
                    secureUrl={form.cover_secure_url}
                    size={720}
                  />
                  {!readonly ? (
                    <Button
                      className="absolute right-2 top-2"
                      onClick={() =>
                        onChange({ ...form, cover_public_id: "", cover_secure_url: "" })
                      }
                      size="icon"
                      type="button"
                      variant="secondary"
                    >
                      <XIcon />
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-md border border-dashed bg-muted/30 text-muted-foreground">
                  <ImageIcon className="size-8" />
                </div>
              )}
              {!readonly ? (
                <Button className="mt-3" onClick={onPickImage} type="button" variant="outline">
                  <ImageIcon data-icon="inline-start" />
                  Select from media
                </Button>
              ) : null}
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="product-description">Description</FieldLabel>
            <Textarea
              disabled={readonly}
              id="product-description"
              onChange={(event) =>
                onChange({ ...form, short_description: event.target.value })
              }
              placeholder="Product details..."
              value={form.short_description}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

export function ClassificationSection({
  form,
  categories,
  readonly,
  onChange,
}: {
  form: ProductForm;
  categories: Category[];
  readonly: boolean;
  onChange: (form: ProductForm) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Classification</CardTitle>
        <CardDescription>Select one or more assignable catalog categories.</CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel className="mb-3 block">Categories</FieldLabel>
          <ToggleGroup
            aria-label="Product categories"
            className="flex-wrap justify-start"
            disabled={readonly}
            multiple
            onValueChange={(categoryIds) =>
              onChange({ ...form, category_ids: categoryIds })
            }
            value={form.category_ids}
            variant="outline"
          >
            {categories.map((category) => (
              <ToggleGroupItem key={category.id} value={category.id}>
                {category.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {!categories.length ? (
            <FieldDescription>No assignable categories are available.</FieldDescription>
          ) : null}
        </Field>
      </CardContent>
    </Card>
  );
}

export function FlavorsManager({
  form,
  readonly,
  onChange,
  onPickImage,
}: {
  form: ProductForm;
  readonly: boolean;
  onChange: (form: ProductForm) => void;
  onPickImage: (index: number) => void;
}) {
  const [globalStock, setGlobalStock] = useState("");

  const updateFlavorAt = (index: number, values: Partial<ProductFlavorForm>) => {
    onChange({
      ...form,
      flavors: form.flavors.map((flavor, flavorIndex) =>
        flavorIndex === index ? { ...flavor, ...values } : flavor,
      ),
    });
  };

  const removeFlavorAt = (index: number) => {
    onChange({
      ...form,
      flavors: form.flavors.filter((_, flavorIndex) => flavorIndex !== index),
    });
  };

  const applyGlobalStock = () => {
    const quantity = Number(globalStock);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      toast.error("Enter a valid stock quantity.");
      return;
    }
    onChange({
      ...form,
      flavors: form.flavors.map((flavor) =>
        flavor.id ? flavor : { ...flavor, initial_quantity: quantity },
      ),
    });
    toast.success("Initial stock applied to new flavors.");
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Flavors List</CardTitle>
        <CardDescription>
          These are the product variants shown in the Flutter kiosk.
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          {!readonly ? (
            <>
              <Input
                className="h-8 w-28"
                min={0}
                onChange={(event) => setGlobalStock(event.target.value)}
                placeholder="Global Stock"
                type="number"
                value={globalStock}
              />
              <Button onClick={applyGlobalStock} size="sm" type="button" variant="secondary">
                Stock
              </Button>
              <Button
                onClick={() => onChange({ ...form, flavors: [...form.flavors, emptyFlavor()] })}
                size="sm"
                type="button"
              >
                <PlusIcon data-icon="inline-start" />
                Add Flavor
              </Button>
            </>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {form.flavors.map((flavor, index) => (
          <div className="grid gap-4 rounded-lg border p-4" key={flavor.id ?? index}>
            <div className="grid gap-4 md:grid-cols-[88px_1fr_120px_96px] md:items-end">
              <Field>
                <FieldLabel>Image</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  {flavor.main_image_secure_url ? (
                    <div className="relative size-16 overflow-hidden rounded-md border">
                      <CloudinaryImage
                        alt={flavor.name || "Flavor image"}
                        className="size-16 object-cover"
                        publicId={flavor.main_image_public_id}
                        secureUrl={flavor.main_image_secure_url}
                        size={160}
                      />
                      {!readonly ? (
                        <button
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
                          onClick={() =>
                            updateFlavorAt(index, {
                              main_image_public_id: "",
                              main_image_secure_url: "",
                            })
                          }
                          type="button"
                        >
                          <XIcon className="size-4 text-white" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {!readonly ? (
                    <Button
                      className="size-16"
                      onClick={() => onPickImage(index)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <CameraIcon />
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Field>
                <FieldLabel>Flavor Name</FieldLabel>
                <Input
                  disabled={readonly}
                  onChange={(event) => updateFlavorAt(index, { name: event.target.value })}
                  placeholder="Select or type flavor"
                  value={flavor.name}
                />
              </Field>
              {!flavor.id ? (
                <Field>
                  <FieldLabel>Stock</FieldLabel>
                  <Input
                    disabled={readonly}
                    min={0}
                    onChange={(event) =>
                      updateFlavorAt(index, {
                        initial_quantity: Number(event.target.value),
                      })
                    }
                    type="number"
                    value={flavor.initial_quantity}
                  />
                </Field>
              ) : <div />}
              <div className="flex items-center justify-end gap-2 md:justify-center">
                <Field className="items-center gap-2" orientation="horizontal">
                  <FieldLabel>Active</FieldLabel>
                  <Switch
                    checked={flavor.is_active}
                    disabled={readonly}
                    onCheckedChange={(checked) => updateFlavorAt(index, { is_active: checked })}
                  />
                </Field>
                {!readonly ? (
                  <Button
                    className="text-destructive"
                    disabled={form.flavors.length === 1}
                    onClick={() => removeFlavorAt(index)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Field className="items-center gap-2" orientation="horizontal">
                <FieldLabel>Featured</FieldLabel>
                <Switch
                  checked={flavor.is_featured}
                  disabled={readonly}
                  onCheckedChange={(checked) => updateFlavorAt(index, { is_featured: checked })}
                />
              </Field>
              <Field className="w-32">
                <FieldLabel>Display Order</FieldLabel>
                <Input
                  disabled={readonly}
                  min={0}
                  onChange={(event) =>
                    updateFlavorAt(index, { display_order: Number(event.target.value) })
                  }
                  type="number"
                  value={flavor.display_order}
                />
              </Field>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ProductPreviewDialog({
  form,
  brands,
  open,
  onOpenChange,
}: {
  form: ProductForm;
  brands: Brand[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const brand = brands.find((item) => item.id === form.brand_id);
  const activeFlavors = form.flavors.filter((flavor) => flavor.is_active);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b p-6">
          <DialogTitle>Live Product Preview</DialogTitle>
        </DialogHeader>
        <div className="grid min-h-0 gap-6 overflow-y-auto p-6 md:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-xl border bg-muted/30">
            {form.cover_secure_url ? (
              <CloudinaryImage
                alt={form.name || "Product"}
                className="aspect-square w-full object-cover"
                publicId={form.cover_public_id}
                secureUrl={form.cover_secure_url}
                size={640}
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-muted-foreground">
                <ImageIcon className="size-10" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm text-muted-foreground">{brand?.name ?? "No brand selected"}</p>
              <h2 className="text-2xl font-semibold">{form.name || "New Product"}</h2>
              {form.short_description ? (
                <p className="mt-2 text-sm text-muted-foreground">{form.short_description}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {activeFlavors.map((flavor, index) => (
                <div className="rounded-lg border p-2" key={flavor.id ?? index}>
                  {flavor.main_image_secure_url ? (
                    <CloudinaryImage
                      alt={flavor.name}
                      className="aspect-square w-full rounded-md object-cover"
                      publicId={flavor.main_image_public_id}
                      secureUrl={flavor.main_image_secure_url}
                      size={240}
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <ImageIcon className="size-5" />
                    </div>
                  )}
                  <p className="mt-2 truncate text-sm font-medium">{flavor.name || "Flavor"}</p>
                  {flavor.is_featured ? (
                    <Badge className="mt-1" variant="secondary">
                      Featured
                    </Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
