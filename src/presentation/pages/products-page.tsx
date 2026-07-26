import { useEffect, useMemo, useState } from "react";
import { useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeftIcon,
  CameraIcon,
  EyeIcon,
  ImageIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Brand, Category, Flavor, Product } from "@/domain/entities";
import type { CloudinaryAsset } from "@/domain/media";
import { rpcGateway } from "@/infrastructure/supabase/rpc-gateway";
import { toAppError } from "@/shared/errors";
import { CloudinaryImage } from "@/presentation/components/cloudinary-image";
import { MediaPicker } from "@/presentation/components/media-picker";
import { DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { ActiveBadge } from "@/presentation/components/status-badge";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";

type PageMode = "list" | "create" | "edit" | "show";

interface ProductFlavorForm {
  id?: string;
  name: string;
  main_image_public_id: string;
  main_image_secure_url: string;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  initial_quantity: number;
}

interface ProductForm {
  name: string;
  brand_id: string;
  cover_public_id: string;
  cover_secure_url: string;
  short_description: string;
  display_order: number;
  is_active: boolean;
  category_ids: string[];
  flavors: ProductFlavorForm[];
}

const emptyFlavor = (): ProductFlavorForm => ({
  name: "",
  main_image_public_id: "",
  main_image_secure_url: "",
  display_order: 0,
  is_featured: false,
  is_active: true,
  initial_quantity: 0,
});

const emptyForm: ProductForm = {
  name: "",
  brand_id: "",
  cover_public_id: "",
  cover_secure_url: "",
  short_description: "",
  display_order: 0,
  is_active: true,
  category_ids: [],
  flavors: [emptyFlavor()],
};

type SaveProductResult = Array<{
  product_id: string;
  created: boolean;
  updated_at: string;
}>;

export function ProductsPage({ mode = "list" }: { mode?: PageMode }) {
  const navigate = useNavigate();
  const params = useParams();
  const invalidate = useInvalidate();
  const products = useList<Product>({
    resource: "products",
    pagination: { mode: "off" },
    sorters: [{ field: "display_order", order: "asc" }],
    meta: {
      select: "*,brands(id,name),product_categories(category_id,categories(id,name))",
    },
  });
  const flavors = useList<Flavor>({
    resource: "flavors",
    pagination: { mode: "off" },
    sorters: [{ field: "display_order", order: "asc" }],
    meta: { select: "*,inventory(current_quantity,updated_at)" },
  });
  const brands = useList<Brand>({
    resource: "brands",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });
  const categories = useList<Category>({
    resource: "categories",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });
  const updateFlavor = useUpdate<Flavor>();
  const remove = useDelete<Product>();
  const current = products.result.data.find((product) => product.id === params.id);
  const currentFlavors = useMemo(
    () =>
      current
        ? flavors.result.data.filter((flavor) => flavor.product_id === current.id)
        : [],
    [current, flavors.result.data],
  );
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [flavorPickerIndex, setFlavorPickerIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (current) {
      setForm({
        name: current.name,
        brand_id: current.brand_id,
        cover_public_id: current.cover_public_id ?? "",
        cover_secure_url: current.cover_secure_url ?? "",
        short_description: current.short_description ?? "",
        display_order: current.display_order,
        is_active: current.is_active,
        category_ids:
          current.product_categories?.map((link) => link.category_id) ?? [],
        flavors: currentFlavors.length
          ? currentFlavors.map((flavor) => ({
              id: flavor.id,
              name: flavor.name,
              main_image_public_id: flavor.main_image_public_id,
              main_image_secure_url: flavor.main_image_secure_url,
              display_order: flavor.display_order,
              is_featured: flavor.is_featured,
              is_active: flavor.is_active,
              initial_quantity: flavor.inventory?.current_quantity ?? 0,
            }))
          : [emptyFlavor()],
      });
    } else if (mode === "create") {
      setForm({ ...emptyForm, flavors: [emptyFlavor()] });
    }
  }, [current, currentFlavors, mode]);

  const assignableCategories = categories.result.data.filter((category) => {
    if (category.parent_id) return true;
    return !categories.result.data.some((child) => child.parent_id === category.id);
  });

  const flavorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const flavor of flavors.result.data) {
      if (!flavor.is_active) continue;
      counts.set(flavor.product_id, (counts.get(flavor.product_id) ?? 0) + 1);
    }
    return counts;
  }, [flavors.result.data]);

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.cover_public_id || row.original.cover_secure_url ? (
              <CloudinaryImage
                alt=""
                className="size-10 rounded-md border object-cover"
                publicId={row.original.cover_public_id}
                secureUrl={row.original.cover_secure_url}
                size={96}
              />
            ) : (
              <div className="size-10 rounded-md bg-muted" />
            )}
            <div className="flex flex-col gap-1">
              <span className="font-medium">{row.original.name}</span>
              <span className="text-xs text-muted-foreground">
                {row.original.brands?.name ?? "Unknown brand"}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "categories",
        header: "Categories",
        cell: ({ row }) =>
          row.original.product_categories
            ?.map((link) => link.categories?.name)
            .filter(Boolean)
            .join(", ") || "-",
      },
      {
        id: "flavors",
        header: "Flavors",
        cell: ({ row }) => flavorCounts.get(row.original.id) ?? 0,
      },
      { accessorKey: "display_order", header: "Order" },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button aria-label="Product actions" size="icon" variant="ghost" />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate(`/products/show/${row.original.id}`)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/products/edit/${row.original.id}`)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteTarget(row.original)}
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [flavorCounts, navigate],
  );

  const close = () => navigate("/products");

  const updateFlavorAt = (index: number, values: Partial<ProductFlavorForm>) => {
    setForm((previous) => ({
      ...previous,
      flavors: previous.flavors.map((flavor, flavorIndex) =>
        flavorIndex === index ? { ...flavor, ...values } : flavor,
      ),
    }));
  };

  const selectCover = (asset: CloudinaryAsset | undefined) => {
    if (!asset) return;
    setForm({
      ...form,
      cover_public_id: asset.publicId,
      cover_secure_url: asset.secureUrl,
    });
  };

  const selectFlavorImage = (asset: CloudinaryAsset | undefined) => {
    if (!asset || flavorPickerIndex === null) return;
    updateFlavorAt(flavorPickerIndex, {
      main_image_public_id: asset.publicId,
      main_image_secure_url: asset.secureUrl,
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.brand_id || !form.category_ids.length) {
      toast.error("Name, brand, and at least one category are required.");
      return;
    }

    const activeFlavors = form.flavors.filter((flavor) => flavor.is_active);
    if (!activeFlavors.length) {
      toast.error("Add at least one active flavor for this product.");
      return;
    }
    for (const flavor of activeFlavors) {
      if (
        !flavor.name.trim() ||
        !flavor.main_image_public_id.trim() ||
        !flavor.main_image_secure_url.startsWith("https://")
      ) {
        toast.error("Every active flavor needs a name and a selected image.");
        return;
      }
    }

    setSaving(true);
    try {
      const result = (await rpcGateway.saveProduct(
        {
          id: current?.id ?? null,
          name: form.name.trim(),
          brand_id: form.brand_id,
          cover_public_id: form.cover_public_id.trim() || null,
          cover_secure_url: form.cover_secure_url.trim() || null,
          short_description: form.short_description.trim() || null,
          search_keywords: [],
          display_order: form.display_order,
          is_active: form.is_active,
        },
        form.category_ids,
      )) as SaveProductResult;
      const productId = result[0]?.product_id ?? current?.id;
      if (!productId) throw new Error("Product save did not return a product id.");

      const keptFlavorIds = new Set<string>();
      for (const flavor of form.flavors) {
        const values = {
          product_id: productId,
          name: flavor.name.trim(),
          main_image_public_id: flavor.main_image_public_id.trim(),
          main_image_secure_url: flavor.main_image_secure_url.trim(),
          search_keywords: [],
          display_order: flavor.display_order,
          is_featured: flavor.is_featured,
          is_active: flavor.is_active,
        };

        if (flavor.id) {
          keptFlavorIds.add(flavor.id);
          await updateFlavor.mutateAsync({
            resource: "flavors",
            id: flavor.id,
            values,
          });
        } else if (flavor.is_active) {
          const created = (await rpcGateway.createFlavor(
            values,
            flavor.initial_quantity,
          )) as Array<{ flavor_id: string }>;
          if (created[0]?.flavor_id) keptFlavorIds.add(created[0].flavor_id);
        }
      }

      for (const existing of currentFlavors) {
        if (!keptFlavorIds.has(existing.id) && existing.is_active) {
          await updateFlavor.mutateAsync({
            resource: "flavors",
            id: existing.id,
            values: { is_active: false },
          });
        }
      }

      await invalidate({ resource: "products", invalidates: ["list", "detail"] });
      await invalidate({ resource: "flavors", invalidates: ["list", "detail"] });
      await invalidate({ resource: "inventory", invalidates: ["list"] });
      toast.success("Product and flavors saved.");
      close();
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const loading =
    products.query.isLoading ||
    flavors.query.isLoading ||
    brands.query.isLoading ||
    categories.query.isLoading;
  const error =
    products.query.error ||
    flavors.query.error ||
    brands.query.error ||
    categories.query.error;
  const readonly = mode === "show";
  const editorTitle = readonly
    ? current?.name
    : mode === "create"
      ? "Create product"
      : `Edit ${current?.name ?? "product"}`;
  const editorDescription =
    "Product information, classification, preview, and flavors follow the same admin flow as the reference project.";
  const editor = (
    <>
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={close} variant="outline">
              <ArrowLeftIcon data-icon="inline-start" />
              Back to products
            </Button>
            <Button onClick={() => setPreviewOpen(true)} type="button" variant="outline">
              <EyeIcon data-icon="inline-start" />
              Preview
            </Button>
            {!readonly ? (
              <Button disabled={saving} onClick={save} type="button">
                {saving ? <Spinner data-icon="inline-start" /> : null}
                {saving ? "Saving..." : "Save Product"}
              </Button>
            ) : null}
          </div>
        }
        description={editorDescription}
        title={editorTitle ?? "Product"}
      />
      {loading ? <TableSkeleton /> : null}
      {error ? <ErrorState message={toAppError(error).message} /> : null}
      {!loading && (mode === "create" || current) ? (
        <Tabs className="pb-4" defaultValue="general">
          <div className="sticky top-14 z-20 -mx-4 mb-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <TabsList
                className="h-auto w-full justify-start rounded-none border-b-0 bg-transparent p-0 md:w-auto"
                variant="line"
              >
                <TabsTrigger className="px-4 py-2" value="general">
                  General Info
                </TabsTrigger>
                <TabsTrigger className="px-4 py-2" value="flavors">
                  Flavors
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setPreviewOpen(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <EyeIcon data-icon="inline-start" />
                  Preview
                </Button>
                {!readonly ? (
                  <Button disabled={saving} onClick={save} size="sm" type="button">
                    {saving ? <Spinner data-icon="inline-start" /> : null}
                    {saving ? "Saving..." : "Save Product"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <TabsContent className="space-y-6" value="general">
            <div className="grid gap-6 lg:grid-cols-2">
              <BasicInfoSection
                brands={brands.result.data}
                form={form}
                onChange={setForm}
                onPickImage={() => setCoverPickerOpen(true)}
                readonly={readonly}
              />
              <ClassificationSection
                categories={assignableCategories}
                form={form}
                onChange={setForm}
                readonly={readonly}
              />
            </div>
          </TabsContent>

          <TabsContent className="space-y-6" value="flavors">
            <FlavorsManager
              form={form}
              onChange={setForm}
              onPickImage={setFlavorPickerIndex}
              readonly={readonly}
            />
          </TabsContent>

          <div className="sticky bottom-0 z-20 mt-6 flex justify-end gap-2 border-t bg-background/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
            <Button onClick={close} variant="outline">
              Close
            </Button>
            {!readonly ? (
              <Button disabled={saving} onClick={save}>
                {saving ? <Spinner data-icon="inline-start" /> : null}
                {saving ? "Saving..." : "Save product"}
              </Button>
            ) : null}
          </div>
        </Tabs>
      ) : null}
      {!loading && mode !== "create" && !current ? (
        <ErrorState message="Product was not found." />
      ) : null}
      <ProductPreviewDialog
        brands={brands.result.data}
        form={form}
        onOpenChange={setPreviewOpen}
        open={previewOpen}
      />
      <MediaPicker
        onOpenChange={setCoverPickerOpen}
        onSelect={(assets) => selectCover(assets[0])}
        open={coverPickerOpen}
        selectedPublicId={form.cover_public_id}
      />
      <MediaPicker
        onOpenChange={(open) => {
          if (!open) setFlavorPickerIndex(null);
        }}
        onSelect={(assets) => selectFlavorImage(assets[0])}
        open={flavorPickerIndex !== null}
        selectedPublicId={
          flavorPickerIndex === null
            ? undefined
            : form.flavors[flavorPickerIndex]?.main_image_public_id
        }
      />
    </>
  );

  if (mode !== "list") {
    return editor;
  }

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={() => navigate("/products/create")}>
            <PlusIcon data-icon="inline-start" />
            Add product
          </Button>
        }
        description="Create products and manage their flavors from one place."
        title="Products"
      />
      {loading ? <TableSkeleton /> : null}
      {error ? <ErrorState message={toAppError(error).message} /> : null}
      {!loading ? (
        <DataTable
          columns={columns}
          data={products.result.data}
          searchPlaceholder="Search products..."
        />
      ) : null}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the product and may fail if related records still depend on it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.mutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                remove.mutate(
                  { resource: "products", id: deleteTarget.id },
                  {
                    onSuccess: () => {
                      setDeleteTarget(null);
                      toast.success("Product deleted.");
                    },
                    onError: (error) => toast.error(toAppError(error).message),
                  },
                );
              }}
              variant="destructive"
            >
              Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

function BasicInfoSection({
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

function ClassificationSection({
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
  const toggleCategory = (categoryId: string) => {
    if (readonly) return;
    onChange({
      ...form,
      category_ids: form.category_ids.includes(categoryId)
        ? form.category_ids.filter((id) => id !== categoryId)
        : [...form.category_ids, categoryId],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classification</CardTitle>
        <CardDescription>Select one or more assignable catalog categories.</CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel className="mb-3 block">Categories</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isSelected = form.category_ids.includes(category.id);
              return (
                <Badge
                  className={`h-7 cursor-pointer select-none px-3 ${
                    readonly ? "cursor-default opacity-80" : ""
                  }`}
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  variant={isSelected ? "default" : "outline"}
                >
                  {category.name}
                </Badge>
              );
            })}
          </div>
          {!categories.length ? (
            <FieldDescription>No assignable categories are available.</FieldDescription>
          ) : null}
        </Field>
      </CardContent>
    </Card>
  );
}

function FlavorsManager({
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
    if (!Number.isFinite(quantity) || quantity < 0) {
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
      <CardContent className="space-y-4">
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
              ) : (
                <Field>
                  <FieldLabel>Order</FieldLabel>
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
              )}
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

function ProductPreviewDialog({
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
          <div className="space-y-5">
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
