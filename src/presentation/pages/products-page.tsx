import { useEffect, useMemo, useState } from "react";
import { useInvalidate, useList, useOne, useUpdate } from "@refinedev/core";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Brand, Category, Flavor, Product } from "@/domain/entities";
import type { CloudinaryAsset } from "@/domain/media";
import {
  hasFlavorChanges,
  hasProductChanges,
} from "@/application/products/product-change-set";
import {
  emptyFlavor,
  emptyForm,
  type ProductFlavorForm,
  type ProductForm,
} from "@/presentation/features/products/product-form-model";
import {
  BasicInfoSection,
  ClassificationSection,
  FlavorsManager,
  ProductPreviewDialog,
} from "@/presentation/features/products/product-editor-sections";
import { rpcGateway } from "@/infrastructure/supabase/rpc-gateway";
import { toAppError } from "@/shared/errors";
import { CloudinaryImage } from "@/presentation/components/cloudinary-image";
import { MediaPicker } from "@/presentation/components/media-picker";
import { DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { ActiveBadge } from "@/presentation/components/status-badge";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";

type PageMode = "list" | "create" | "edit" | "show";


export function ProductsPage({ mode = "list" }: { mode?: PageMode }) {
  const navigate = useNavigate();
  const params = useParams();
  const invalidate = useInvalidate();
  const products = useList<Product>({
    resource: "products",
    pagination: { mode: "off" },
    sorters: [{ field: "display_order", order: "asc" }],
    meta: {
      select: "id,name,brand_id,cover_public_id,cover_secure_url,short_description,search_keywords,display_order,is_active,created_at,updated_at,brands(id,name),product_categories(category_id,categories(id,name))",
    },
    queryOptions: { enabled: mode === "list" },
  });
  const productDetail = useOne<Product>({
    resource: "products",
    id: params.id ?? "",
    meta: {
      select: "id,name,brand_id,cover_public_id,cover_secure_url,short_description,search_keywords,display_order,is_active,created_at,updated_at,brands(id,name),product_categories(category_id,categories(id,name))",
    },
    queryOptions: { enabled: mode !== "list" && mode !== "create" && Boolean(params.id) },
  });
  const flavors = useList<Flavor>({
    resource: "flavors",
    pagination: { mode: "off" },
    sorters: [{ field: "display_order", order: "asc" }],
    filters:
      mode !== "list" && params.id
        ? [{ field: "product_id", operator: "eq", value: params.id }]
        : [],
    meta: {
      select: "id,product_id,name,main_image_public_id,main_image_secure_url,search_keywords,display_order,is_featured,is_active,created_at,updated_at,inventory(current_quantity,updated_at)",
    },
    queryOptions: { enabled: mode === "list" || Boolean(params.id) },
  });
  const brands = useList<Brand>({
    resource: "brands",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
    meta: {
      select: "id,name,image_public_id,image_secure_url,display_order,is_active,created_at,updated_at",
    },
    queryOptions: { enabled: mode !== "list" },
  });
  const categories = useList<Category>({
    resource: "categories",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
    meta: {
      select: "id,name,parent_id,image_public_id,image_secure_url,display_order,is_active,created_at,updated_at",
    },
    queryOptions: { enabled: mode !== "list" },
  });
  const updateFlavor = useUpdate<Flavor>();
  const updateProduct = useUpdate<Product>();
  const current = productDetail.result;
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
  const [activeTab, setActiveTab] = useState("general");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

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
                  Deactivate
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
    setValidationMessage(null);
    if (!form.name.trim() || !form.brand_id || !form.category_ids.length) {
      setActiveTab("general");
      setValidationMessage("Enter a product name, select a brand, and choose at least one category.");
      return;
    }

    const activeFlavors = form.flavors.filter((flavor) => flavor.is_active);
    if (!activeFlavors.length) {
      setActiveTab("flavors");
      setValidationMessage("Add at least one active flavor before saving.");
      return;
    }
    for (const flavor of activeFlavors) {
      if (
        !flavor.name.trim() ||
        !flavor.main_image_public_id.trim() ||
        !flavor.main_image_secure_url.startsWith("https://")
      ) {
        setActiveTab("flavors");
        setValidationMessage("Every active flavor needs a name and an image from Media.");
        return;
      }
    }

    setSaving(true);
    try {
      let productId = current?.id;
      let changed = false;

      if (!current || hasProductChanges(form, current)) {
        const result = await rpcGateway.saveProduct(
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
        );
        productId = result[0]?.product_id ?? current?.id;
        changed = true;
      }

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
          const existing = currentFlavors.find((item) => item.id === flavor.id);
          if (existing && hasFlavorChanges(flavor, existing)) {
            await updateFlavor.mutateAsync({
              resource: "flavors",
              id: flavor.id,
              values,
              successNotification: false,
              errorNotification: false,
            });
            changed = true;
          }
        } else if (flavor.is_active) {
          const created = (await rpcGateway.createFlavor(
            values,
            flavor.initial_quantity,
          )) as Array<{ flavor_id: string }>;
          if (created[0]?.flavor_id) keptFlavorIds.add(created[0].flavor_id);
          changed = true;
        }
      }

      for (const existing of currentFlavors) {
        if (!keptFlavorIds.has(existing.id) && existing.is_active) {
          await updateFlavor.mutateAsync({
            resource: "flavors",
            id: existing.id,
            values: { is_active: false },
            successNotification: false,
            errorNotification: false,
          });
          changed = true;
        }
      }

      if (!changed) {
        toast.info("No changes to save.");
        return;
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
    productDetail.query.isLoading ||
    flavors.query.isLoading ||
    brands.query.isLoading ||
    categories.query.isLoading;
  const error =
    products.query.error ||
    productDetail.query.error ||
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
    "Manage product details, categories, images, and flavors in one place.";
  const editor = (
    <>
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={close} variant="outline">
              <ArrowLeftIcon data-icon="inline-start" />
              Back to products
            </Button>
          </div>
        }
        description={editorDescription}
        title={editorTitle ?? "Product"}
      />
      {loading ? <TableSkeleton /> : null}
      {error ? <ErrorState message={toAppError(error).message} /> : null}
      {validationMessage ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Review the required fields</AlertTitle>
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      ) : null}
      {!loading && (mode === "create" || current) ? (
        <Tabs className="pb-4" onValueChange={setActiveTab} value={activeTab}>
          <div className="sticky top-14 -mx-4 mb-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          <TabsContent className="flex flex-col gap-6" value="general">
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

          <TabsContent className="flex flex-col gap-6" value="flavors">
            <FlavorsManager
              form={form}
              onChange={setForm}
              onPickImage={setFlavorPickerIndex}
              readonly={readonly}
            />
          </TabsContent>

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
            <AlertDialogTitle>Deactivate {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The product is hidden from the active catalog while historical orders and related
              records remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateProduct.mutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                updateProduct.mutate(
                  {
                    resource: "products",
                    id: deleteTarget.id,
                    values: { is_active: false },
                    successNotification: false,
                    errorNotification: false,
                  },
                  {
                    onSuccess: () => {
                      setDeleteTarget(null);
                      void invalidate({
                        resource: "products",
                        invalidates: ["list", "detail"],
                      });
                      toast.success("Product deactivated.");
                    },
                    onError: (error) => toast.error(toAppError(error).message),
                  },
                );
              }}
              variant="destructive"
            >
              Deactivate product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
