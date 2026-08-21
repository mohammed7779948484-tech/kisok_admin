import { useEffect, useMemo, useRef, useState } from "react";
import {
  useCreate,
  useInvalidate,
  useList,
  useUpdate,
} from "@refinedev/core";
import type { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ImageIcon,
  XIcon,
  Trash2Icon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { Brand, Category, Product } from "@/domain/entities";
import { rpcGateway } from "@/infrastructure/supabase/rpc-gateway";
import { toAppError } from "@/shared/errors";
import { DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { ActiveBadge } from "@/presentation/components/status-badge";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";
import { CloudinaryImage } from "@/presentation/components/cloudinary-image";
import { MediaPicker } from "@/presentation/components/media-picker";
import { calculateDeactivationImpact } from "@/application/catalog/deactivation-impact";
import { useCatalogVisibility } from "@/presentation/hooks/use-catalog-visibility";
import { useUnsavedChangesWarning } from "@/presentation/hooks/use-unsaved-changes-warning";

type CatalogRow = Brand | Category;
type PageMode = "list" | "create" | "edit" | "show";

interface FormValue {
  name: string;
  image_public_id: string;
  image_secure_url: string;
  display_order: number;
  is_active: boolean;
  parent_id: string;
}

const emptyForm: FormValue = {
  name: "",
  image_public_id: "",
  image_secure_url: "",
  display_order: 0,
  is_active: true,
  parent_id: "",
};

export function CatalogDirectPage({
  kind,
  mode = "list",
}: {
  kind: "brands" | "categories";
  mode?: PageMode;
}) {
  const navigate = useNavigate();
  const params = useParams();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const isCategory = kind === "categories";
  const title = isCategory ? "Categories" : "Brands";
  const query = useList<CatalogRow>({
    resource: kind,
    pagination: { mode: "off" },
    sorters: [
      { field: "display_order", order: "asc" },
      { field: "name", order: "asc" },
    ],
  });
  const create = useCreate<CatalogRow, ReturnType<typeof toAppError>, Partial<CatalogRow>>();
  const update = useUpdate<CatalogRow, ReturnType<typeof toAppError>, Partial<CatalogRow>>();
  const current = query.result.data.find((row) => row.id === params.id);
  const [form, setForm] = useState<FormValue>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CatalogRow | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [submittingRpc, setSubmittingRpc] = useState(false);
  const [initialForm, setInitialForm] = useState(() => JSON.stringify(emptyForm));
  const [deactivationIntent, setDeactivationIntent] = useState<"persist" | "form">("persist");
  const [confirmedDeactivationId, setConfirmedDeactivationId] = useState<string | null>(null);
  const hydratedRouteRef = useRef<string | null>(null);
  const pending =
    create.mutation.isPending || update.mutation.isPending || submittingRpc;
  const impactedProducts = useList<Product>({
    resource: "products",
    pagination: { mode: "off" },
    filters: [{ field: "is_active", operator: "eq", value: true }],
    meta: { select: "id,brand_id,is_active,product_categories(category_id)" },
    queryOptions: { enabled: Boolean(deleteTarget) },
  });
  const catalogVisibility = useCatalogVisibility({ enabled: Boolean(deleteTarget) });
  const hasUnsavedChanges =
    mode === "create"
      ? JSON.stringify(form) !== JSON.stringify(emptyForm)
      : mode === "edit" && JSON.stringify(form) !== initialForm;
  useUnsavedChangesWarning(hasUnsavedChanges && !pending);

  useEffect(() => {
    const routeKey = `${mode}:${params.id ?? ""}`;
    if (hydratedRouteRef.current === routeKey) return;
    if (current) {
      const nextForm = {
        name: current.name,
        image_public_id: current.image_public_id ?? "",
        image_secure_url: current.image_secure_url ?? "",
        display_order: current.display_order,
        is_active: current.is_active,
        parent_id: isCategory ? ((current as Category).parent_id ?? "") : "",
      };
      setForm(nextForm);
      setInitialForm(JSON.stringify(nextForm));
      hydratedRouteRef.current = routeKey;
    } else if (mode === "create") {
      setForm(emptyForm);
      setInitialForm(JSON.stringify(emptyForm));
      hydratedRouteRef.current = routeKey;
    }
  }, [current, isCategory, mode, params.id]);

  const roots = useMemo(
    () =>
      isCategory
        ? (query.result.data as Category[]).filter(
            (category) =>
              !category.parent_id && (category.is_active || category.id === form.parent_id),
          )
        : [],
    [form.parent_id, isCategory, query.result.data],
  );
  const deactivationImpact = useMemo(() => {
    if (!deleteTarget) return { products: 0, flavors: 0, children: 0 };
    return calculateDeactivationImpact({
      targetId: deleteTarget.id,
      kind,
      categories: isCategory ? (query.result.data as Category[]) : [],
      products: impactedProducts.result.data,
      visibility: catalogVisibility.data ?? [],
    });
  }, [
    catalogVisibility.data,
    deleteTarget,
    impactedProducts.result.data,
    isCategory,
    kind,
    query.result.data,
  ]);
  const columns = useMemo<ColumnDef<CatalogRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.image_public_id || row.original.image_secure_url ? (
              <CloudinaryImage
                alt=""
                className="size-9 rounded-md border object-cover"
                publicId={row.original.image_public_id}
                secureUrl={row.original.image_secure_url}
                size={80}
              />
            ) : (
              <div className="size-9 rounded-md bg-muted" />
            )}
            <div className="flex flex-col gap-1">
              <span className="font-medium">{row.original.name}</span>
              {isCategory && (row.original as Category).parent_id ? (
                <span className="text-xs text-muted-foreground">
                  Child of{" "}
                  {roots.find(
                    (root) => root.id === (row.original as Category).parent_id,
                  )?.name ?? "Unknown"}
                </span>
              ) : null}
            </div>
          </div>
        ),
      },
      { accessorKey: "display_order", header: "Display order" },
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
            <DropdownMenuTrigger render={<Button aria-label="Record actions" size="icon" variant="ghost" />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate(`/${kind}/edit/${row.original.id}`)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                {!row.original.is_active ? (
                  <DropdownMenuItem
                    onClick={() =>
                      update.mutate(
                      {
                        resource: kind,
                        id: row.original.id,
                        values: { is_active: true },
                        successNotification: false,
                        errorNotification: false,
                      },
                      {
                        onSuccess: () => {
                          void queryClient.invalidateQueries({ queryKey: ["admin-catalog-visibility"] });
                          toast.success("Record activated.");
                        },
                        onError: (error) => toast.error(toAppError(error).message),
                      },
                    )
                    }
                  >
                    Activate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setDeactivationIntent("persist");
                      setDeleteTarget(row.original);
                    }}
                  >
                    <Trash2Icon />
                    Deactivate
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [isCategory, kind, navigate, queryClient, roots, update],
  );

  const closeSheet = () => navigate(`/${kind}`);
  const save = async () => {
    if (
      current?.is_active &&
      !form.is_active &&
      confirmedDeactivationId !== current.id
    ) {
      setDeactivationIntent("form");
      setDeleteTarget(current);
      return;
    }
    const imageUrl = form.image_secure_url.trim();
    if (!Number.isSafeInteger(form.display_order) || form.display_order < 0) {
      toast.error("Display order must be a nonnegative whole number.");
      return;
    }
    if (imageUrl && !imageUrl.startsWith("https://")) {
      toast.error("Image URL must use HTTPS.");
      return;
    }
    const values = {
      name: form.name.trim(),
      image_public_id: form.image_public_id.trim() || null,
      image_secure_url: imageUrl || null,
      display_order: form.display_order,
      is_active: form.is_active,
      ...(isCategory && mode === "edit"
        ? { parent_id: form.parent_id || null }
        : {}),
    };
    if (!values.name) {
      toast.error("Name is required.");
      return;
    }
    try {
      if (mode === "create" && isCategory && form.parent_id) {
        setSubmittingRpc(true);
        await rpcGateway.createChildCategory(form.parent_id, values);
        await invalidate({ resource: kind, invalidates: ["list"] });
      } else if (mode === "create") {
        await create.mutateAsync({
          resource: kind,
          values,
          successNotification: false,
          errorNotification: false,
        });
      } else if (current) {
        await update.mutateAsync({
          resource: kind,
          id: current.id,
          values,
          successNotification: false,
          errorNotification: false,
        });
      }
      toast.success(`${isCategory ? "Category" : "Brand"} saved.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-catalog-visibility"] });
      closeSheet();
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSubmittingRpc(false);
    }
  };

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={() => navigate(`/${kind}/create`)}>
            <PlusIcon data-icon="inline-start" />
            Add {isCategory ? "category" : "brand"}
          </Button>
        }
        description={
          isCategory
            ? "Organize the catalog hierarchy and customer navigation."
            : "Manage catalog brands, ordering, visibility, and imagery."
        }
        title={title}
      />
      {query.query.isLoading ? <TableSkeleton /> : null}
      {query.query.error ? (
        <ErrorState message={toAppError(query.query.error).message} />
      ) : null}
      {!query.query.isLoading ? (
        <DataTable
          columns={columns}
          data={query.result.data}
          reorder={{
            getId: (row) => row.id,
            disabled: submittingRpc,
            onReorder: async (orderedIds) => {
              setSubmittingRpc(true);
              try {
                await rpcGateway.reorderCatalogItems(kind, orderedIds);
                await invalidate({ resource: kind, invalidates: ["list"] });
                toast.success(`${title} reordered.`);
              } catch (error) {
                toast.error(toAppError(error).message);
              } finally {
                setSubmittingRpc(false);
              }
            },
          }}
          searchPlaceholder={`Search ${kind}...`}
        />
      ) : null}
      <Sheet
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        open={mode !== "list" && (mode === "create" || Boolean(current))}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {mode === "create" ? `Create ${title.slice(0, -1)}` : `Edit ${current?.name ?? title}`}
            </SheetTitle>
            <SheetDescription>
              Use an HTTPS Cloudinary URL and public ID when an image is available.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${kind}-name`}>Name</FieldLabel>
                <Input
                  disabled={mode === "show"}
                  id={`${kind}-name`}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  value={form.name}
                />
              </Field>
              {isCategory && mode === "create" ? (
                <Field>
                  <FieldLabel>Parent category</FieldLabel>
                  <Select
                    items={[
                      { label: "Root category", value: "" },
                      ...roots.map((root) => ({ label: root.name, value: root.id })),
                    ]}
                    onValueChange={(value) =>
                      setForm({ ...form, parent_id: String(value ?? "") })
                    }
                    value={form.parent_id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="">Root category</SelectItem>
                        {roots.map((root) => (
                          <SelectItem key={root.id} value={root.id}>
                            {root.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Child creation uses the hierarchy-safe database operation.
                  </FieldDescription>
                </Field>
              ) : null}
              <Field>
                <FieldLabel>Image</FieldLabel>
                {form.image_secure_url ? (
                  <CloudinaryImage
                    alt="Image preview"
                    className="mt-2 aspect-video w-full rounded-lg border object-cover"
                    publicId={form.image_public_id}
                    secureUrl={form.image_secure_url}
                    size={640}
                  />
                ) : null}
                {mode !== "show" ? (
                  <div className="mt-2 flex gap-2">
                    <Button onClick={() => setMediaPickerOpen(true)} type="button" variant="outline">
                      <ImageIcon data-icon="inline-start" />
                      Select from media
                    </Button>
                    {form.image_secure_url ? (
                      <Button
                        onClick={() =>
                          setForm({ ...form, image_public_id: "", image_secure_url: "" })
                        }
                        type="button"
                        variant="ghost"
                      >
                        <XIcon data-icon="inline-start" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${kind}-order`}>Display order</FieldLabel>
                <Input
                  disabled={mode === "show"}
                  id={`${kind}-order`}
                  min={0}
                  onChange={(event) =>
                    setForm({ ...form, display_order: Number(event.target.value) })
                  }
                  type="number"
                  value={form.display_order}
                />
              </Field>
              <Field orientation="horizontal">
                <div className="flex flex-1 flex-col gap-1">
                  <FieldLabel htmlFor={`${kind}-active`}>Active</FieldLabel>
                  <FieldDescription>Visible to eligible customer flows.</FieldDescription>
                </div>
                <Switch
                  checked={form.is_active}
                  disabled={mode === "show"}
                  id={`${kind}-active`}
                  onCheckedChange={(checked) => {
                    if (!checked && current?.is_active) {
                      setDeactivationIntent("form");
                      setDeleteTarget(current);
                      return;
                    }
                    if (checked) setConfirmedDeactivationId(null);
                    setForm({ ...form, is_active: checked });
                  }}
                />
              </Field>
            </FieldGroup>
          </div>
          <SheetFooter>
            <Button onClick={closeSheet} variant="outline">
              Cancel
            </Button>
            {mode !== "show" ? (
              <Button disabled={pending} onClick={save}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Saving..." : "Save"}
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
              The record is hidden from the active catalog while dependent products and historical
              data remain intact.
            </AlertDialogDescription>
            {impactedProducts.query.error || catalogVisibility.error ? (
              <p className="text-sm text-destructive">
                Customer impact could not be calculated. Try again before deactivating.
              </p>
            ) : impactedProducts.query.isLoading || catalogVisibility.isLoading ? (
              <p className="text-sm text-muted-foreground">Calculating customer impact…</p>
            ) : (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">This will hide up to:</p>
                <p>{deactivationImpact.products} active products</p>
                <p>{deactivationImpact.flavors} flavors</p>
                {isCategory ? <p>{deactivationImpact.children} child categories</p> : null}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                update.mutation.isPending ||
                impactedProducts.query.isLoading ||
                catalogVisibility.isLoading ||
                Boolean(impactedProducts.query.error || catalogVisibility.error)
              }
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                if (deactivationIntent === "form") {
                  setForm((previous) => ({ ...previous, is_active: false }));
                  setConfirmedDeactivationId(deleteTarget.id);
                  setDeleteTarget(null);
                  return;
                }
                update.mutate(
                  {
                    resource: kind,
                    id: deleteTarget.id,
                    values: { is_active: false },
                    successNotification: false,
                    errorNotification: false,
                  },
                  {
                    onSuccess: () => {
                      setDeleteTarget(null);
                      void invalidate({ resource: kind, invalidates: ["list", "detail"] });
                      void queryClient.invalidateQueries({ queryKey: ["admin-catalog-visibility"] });
                      toast.success("Record deactivated.");
                    },
                    onError: (error) => toast.error(toAppError(error).message),
                  },
                );
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MediaPicker
        onOpenChange={setMediaPickerOpen}
        onSelect={(assets) => {
          const asset = assets[0];
          if (!asset) return;
          setForm({
            ...form,
            image_public_id: asset.publicId,
            image_secure_url: asset.secureUrl,
          });
        }}
        open={mediaPickerOpen}
        selectedPublicId={form.image_public_id}
      />
    </>
  );
}
