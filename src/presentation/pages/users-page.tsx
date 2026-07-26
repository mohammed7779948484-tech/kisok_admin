import { useMemo, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  KeyRoundIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import type { AdminUser, AppRole } from "@/domain/entities";
import type { AdminIdentity } from "@/infrastructure/supabase/auth-provider";
import { adminUsersGateway } from "@/infrastructure/supabase/admin-users-gateway";
import { toAppError } from "@/shared/errors";
import { DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { ActiveBadge } from "@/presentation/components/status-badge";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";

type DialogMode = "create" | "edit" | "password" | null;

const roles: AppRole[] = ["admin", "preparation", "customer"];

export function UsersPage() {
  const queryClient = useQueryClient();
  const { data: identity } = useGetIdentity<AdminIdentity>();
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminUsersGateway.list({ page: 1, perPage: 200 }),
  });
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "deactivate" | "reactivate" | null
  >(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("customer");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const mutation = useMutation({
    mutationFn: async () => {
      if (dialogMode === "create") {
        return adminUsersGateway.create({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          role,
        });
      }
      if (dialogMode === "edit" && selected) {
        return adminUsersGateway.update({
          userId: selected.id,
          displayName: displayName.trim(),
          role,
        });
      }
      if (dialogMode === "password" && selected) {
        return adminUsersGateway.setPassword({
          userId: selected.id,
          password,
        });
      }
      if (confirmAction === "deactivate" && selected) {
        return adminUsersGateway.deactivate(selected.id);
      }
      if (confirmAction === "reactivate" && selected) {
        return adminUsersGateway.reactivate(selected.id);
      }
      throw new Error("No user action selected.");
    },
    onSuccess: async () => {
      await refresh();
      toast.success("User account updated.");
      closeDialogs();
    },
    onError: (error) => toast.error(toAppError(error).message),
  });

  function closeDialogs() {
    setDialogMode(null);
    setConfirmAction(null);
    setSelected(null);
    setEmail("");
    setDisplayName("");
    setRole("customer");
    setPassword("");
    setPasswordConfirm("");
  }

  function openCreate() {
    closeDialogs();
    setDialogMode("create");
  }

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: "displayName",
        header: "User",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{row.original.displayName}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) =>
          row.original.role[0].toUpperCase() + row.original.role.slice(1),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => <ActiveBadge active={row.original.isActive} />,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button aria-label="User actions" size="icon" variant="ghost" />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    closeDialogs();
                    setSelected(row.original);
                    setDisplayName(row.original.displayName);
                    setRole(row.original.role);
                    setDialogMode("edit");
                  }}
                >
                  <PencilIcon />
                  Edit profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    closeDialogs();
                    setSelected(row.original);
                    setDialogMode("password");
                  }}
                >
                  <KeyRoundIcon />
                  Set password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    closeDialogs();
                    setSelected(row.original);
                    setConfirmAction(
                      row.original.isActive ? "deactivate" : "reactivate",
                    );
                  }}
                  variant={row.original.isActive ? "destructive" : "default"}
                >
                  {row.original.isActive ? <UserXIcon /> : <UserCheckIcon />}
                  {row.original.isActive ? "Deactivate" : "Reactivate"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  const submitDialog = () => {
    if (!displayName.trim() && dialogMode !== "password") {
      toast.error("Display name is required.");
      return;
    }
    if (dialogMode === "create" && !email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (dialogMode === "create" || dialogMode === "password") {
      if (password.length < 10 || password !== passwordConfirm) {
        toast.error("Passwords must match and contain at least 10 characters.");
        return;
      }
    }
    mutation.mutate();
  };

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            Add user
          </Button>
        }
        description="Supabase Auth accounts and application roles, managed through a protected Edge Function."
        title="Users"
      />
      {users.isLoading ? <TableSkeleton /> : null}
      {users.error ? <ErrorState message={toAppError(users.error).message} /> : null}
      {users.data ? (
        <DataTable
          columns={columns}
          data={users.data.users}
          searchPlaceholder="Search name, email, or role..."
        />
      ) : null}
      <Dialog
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
        open={Boolean(dialogMode)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? "Create user"
                : dialogMode === "edit"
                  ? "Edit user"
                  : "Set new password"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "password"
                ? `Set a replacement password for ${selected?.email}.`
                : "Account changes are authorized and executed server-side."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {dialogMode === "create" ? (
              <Field>
                <FieldLabel htmlFor="user-email">Email</FieldLabel>
                <Input
                  id="user-email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </Field>
            ) : null}
            {dialogMode !== "password" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="user-name">Display name</FieldLabel>
                  <Input
                    id="user-name"
                    onChange={(event) => setDisplayName(event.target.value)}
                    value={displayName}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-role">Role</FieldLabel>
                  <NativeSelect
                    id="user-role"
                    onChange={(event) => setRole(event.target.value as AppRole)}
                    value={role}
                  >
                    {roles.map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {value[0].toUpperCase() + value.slice(1)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </>
            ) : null}
            {dialogMode === "create" || dialogMode === "password" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="user-password">Password</FieldLabel>
                  <Input
                    id="user-password"
                    minLength={10}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    value={password}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-password-confirm">
                    Confirm password
                  </FieldLabel>
                  <Input
                    id="user-password-confirm"
                    minLength={10}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    type="password"
                    value={passwordConfirm}
                  />
                </Field>
              </>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button onClick={closeDialogs} variant="outline">
              Cancel
            </Button>
            <Button disabled={mutation.isPending} onClick={submitDialog}>
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : null}
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
        open={Boolean(confirmAction)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "deactivate" ? "Deactivate" : "Reactivate"}{" "}
              {selected?.displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "deactivate"
                ? "The profile becomes inactive and Auth access is blocked. Historical records are preserved."
                : "The profile and Auth account will regain access."}
              {selected?.id === identity?.id
                ? " You are changing your own administrator access and may be signed out immediately."
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selected?.id === identity?.id && confirmAction === "deactivate" ? (
            <FieldDescription>
              This is the explicit self-deactivation confirmation required by policy.
            </FieldDescription>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              variant={confirmAction === "deactivate" ? "destructive" : "default"}
            >
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
