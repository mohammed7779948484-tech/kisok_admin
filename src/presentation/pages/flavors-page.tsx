import { useEffect, useMemo, useState } from "react";
import { useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useNavigate, useParams } from "react-router";
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
import type { Flavor, Product } from "@/domain/entities";
import { rpcGateway } from "@/infrastructure/supabase/rpc-gateway";
import { toAppError } from "@/shared/errors";
import { DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { ActiveBadge } from "@/presentation/components/status-badge";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";

type PageMode = "list" | "create" | "edit" | "show";

interface FlavorForm {
  product_id: string;
  name: string;
  main_image_public_id: string;
  main_image_secure_url: string;
  search_keywords: string;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  initial_quantity: number;
}

const emptyForm: FlavorForm = {
  product_id: "",
  name: "",
  main_image_public_id: "",
  main_image_secure_url: "",
  search_keywords: "",
  display_order: 0,
  is_featured: false,
  is_active: true,
  initial_quantity: 0,
};

export function FlavorsPage({ mode = "list" }: { mode?: PageMode }) {
  const navigate = useNavigate();
  const params = useParams();
  const invalidate = useInvalidate();
  const flavors = useList<Flavor>({
    resource: "flavors",
    pagination: { mode: "off" },
    sorters: [{ field: "display_order", order: "asc" }],
    meta: { select: "*,products(id,name),inventory(current_quantity,updated_at)" },
  });
  const products = useList<Product>({
    resource: "products",
    pagination: { mode: "off" },
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
  });
  const update = useUpdate<Flavor>();
  const remove = useDelete<Flavor>();
  const current = flavors.result.data.find((flavor) => flavor.id === params.id);
  const [form, setForm] = useState<FlavorForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Flavor | null>(null);

  useEffect(() => {
    if (current) {
      setForm({
        product_id: current.product_id,
        name: current.name,
        main_image_public_id: current.main_image_public_id,
        main_image_secure_url: current.main_image_secure_url,
        search_keywords: current.search_keywords?.join(", ") ?? "",
        display_order: current.display_order,
        is_featured: current.is_featured,
        is_active: current.is_active,
        initial_quantity: current.inventory?.current_quantity ?? 0,
      });
    } else if (mode === "create") {
      setForm(emptyForm);
    }
  }, [current, mode]);

  const columns = useMemo<ColumnDef<Flavor>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Flavor",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <img
              alt=""
              className="size-10 rounded-md border object-cover"
              src={row.original.main_image_secure_url}
            />
            <div className="flex flex-col gap-1">
              <span className="font-medium">{row.original.name}</span>
              <span className="text-xs text-muted-foreground">
                {row.original.products?.name ?? "Unknown product"}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "stock",
        header: "Stock",
        cell: ({ row }) => row.original.inventory?.current_quantity ?? 0,
      },
      {
        accessorKey: "is_featured",
        header: "Featured",
        cell: ({ row }) => (row.original.is_featured ? "Yes" : "No"),
      },
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
            <DropdownMenuTrigger render={<Button aria-label="Flavor actions" size="icon" variant="ghost" />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate(`/flavors/show/${row.original.id}`)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/flavors/edit/${row.original.id}`)}>
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
    [navigate],
  );

  const close = () => navigate("/flavors");
  const save = async () => {
    if (
      !form.product_id ||
      !form.name.trim() ||
      !form.main_image_public_id.trim() ||
      !form.main_image_secure_url.startsWith("https://")
    ) {
      toast.error("Product, name, public ID, and HTTPS image URL are required.");
      return;
    }
    const values = {
      product_id: form.product_id,
      name: form.name.trim(),
      main_image_public_id: form.main_image_public_id.trim(),
      main_image_secure_url: form.main_image_secure_url.trim(),
      search_keywords: form.search_keywords
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      display_order: form.display_order,
      is_featured: form.is_featured,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      if (mode === "create") {
        await rpcGateway.createFlavor(values, form.initial_quantity);
      } else if (current) {
        await update.mutateAsync({
          resource: "flavors",
          id: current.id,
          values,
        });
      }
      await invalidate({ resource: "flavors", invalidates: ["list", "detail"] });
      await invalidate({ resource: "inventory", invalidates: ["list"] });
      toast.success(
        mode === "create"
          ? "Flavor and initial inventory created atomically."
          : "Flavor saved.",
      );
      close();
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const loading = flavors.query.isLoading || products.query.isLoading;
  const error = flavors.query.error || products.query.error;
  const readonly = mode === "show";

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={() => navigate("/flavors/create")}>
            <PlusIcon data-icon="inline-start" />
            Add flavor
          </Button>
        }
        description="Create variants with their initial inventory in one transaction."
        title="Flavors"
      />
      {loading ? <TableSkeleton /> : null}
      {error ? <ErrorState message={toAppError(error).message} /> : null}
      {!loading ? (
        <DataTable
          columns={columns}
          data={flavors.result.data}
          searchPlaceholder="Search flavors..."
        />
      ) : null}
      <Sheet
        onOpenChange={(open) => {
          if (!open) close();
        }}
        open={mode !== "list" && (mode === "create" || Boolean(current))}
      >
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {readonly
                ? current?.name
                : mode === "create"
                  ? "Create flavor"
                  : `Edit ${current?.name ?? "flavor"}`}
            </SheetTitle>
            <SheetDescription>
              Flavor media is required. Inventory can only be initialized during creation.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Product</FieldLabel>
                <Select
                  items={products.result.data.map((product) => ({
                    label: product.name,
                    value: product.id,
                  }))}
                  onValueChange={(value) => setForm({ ...form, product_id: String(value) })}
                  value={form.product_id}
                >
                  <SelectTrigger disabled={readonly}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {products.result.data.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="flavor-name">Name</FieldLabel>
                <Input
                  disabled={readonly}
                  id="flavor-name"
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  value={form.name}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="flavor-public-id">Cloudinary public ID</FieldLabel>
                <Input
                  disabled={readonly}
                  id="flavor-public-id"
                  onChange={(event) =>
                    setForm({ ...form, main_image_public_id: event.target.value })
                  }
                  value={form.main_image_public_id}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="flavor-url">Secure image URL</FieldLabel>
                <Input
                  disabled={readonly}
                  id="flavor-url"
                  onChange={(event) =>
                    setForm({ ...form, main_image_secure_url: event.target.value })
                  }
                  type="url"
                  value={form.main_image_secure_url}
                />
                {form.main_image_secure_url ? (
                  <img
                    alt="Flavor preview"
                    className="mt-2 aspect-video w-full rounded-lg border object-cover"
                    src={form.main_image_secure_url}
                  />
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="flavor-keywords">Search keywords</FieldLabel>
                <Input
                  disabled={readonly}
                  id="flavor-keywords"
                  onChange={(event) =>
                    setForm({ ...form, search_keywords: event.target.value })
                  }
                  value={form.search_keywords}
                />
              </Field>
              {mode === "create" ? (
                <Field>
                  <FieldLabel htmlFor="initial-stock">Initial stock</FieldLabel>
                  <Input
                    id="initial-stock"
                    min={0}
                    onChange={(event) =>
                      setForm({ ...form, initial_quantity: Number(event.target.value) })
                    }
                    type="number"
                    value={form.initial_quantity}
                  />
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="flavor-order">Display order</FieldLabel>
                <Input
                  disabled={readonly}
                  id="flavor-order"
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
                  <FieldLabel htmlFor="flavor-featured">Featured</FieldLabel>
                  <FieldDescription>Prioritize this flavor in customer views.</FieldDescription>
                </div>
                <Switch
                  checked={form.is_featured}
                  disabled={readonly}
                  id="flavor-featured"
                  onCheckedChange={(checked) => setForm({ ...form, is_featured: checked })}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="flavor-active">Active</FieldLabel>
                <Switch
                  checked={form.is_active}
                  disabled={readonly}
                  id="flavor-active"
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </Field>
            </FieldGroup>
          </div>
          <SheetFooter>
            <Button onClick={close} variant="outline">
              Close
            </Button>
            {!readonly ? (
              <Button disabled={saving} onClick={save}>
                {saving ? <Spinner data-icon="inline-start" /> : null}
                {saving ? "Saving..." : "Save flavor"}
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
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the flavor and may fail if inventory or order records still depend on it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.mutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                remove.mutate(
                  { resource: "flavors", id: deleteTarget.id },
                  {
                    onSuccess: () => {
                      setDeleteTarget(null);
                      toast.success("Flavor deleted.");
                    },
                    onError: (error) => toast.error(toAppError(error).message),
                  },
                );
              }}
              variant="destructive"
            >
              Delete flavor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
