import { Authenticated, Refine } from "@refinedev/core";
import { dataProvider } from "@refinedev/supabase";
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { resources } from "@/app/resources";
import { accessControlProvider } from "@/infrastructure/supabase/access-control";
import { authProvider } from "@/infrastructure/supabase/auth-provider";
import { supabaseClient } from "@/infrastructure/supabase/client";
import { notificationProvider } from "@/infrastructure/refine/notification-provider";
import { AppShell } from "@/presentation/layout/app-shell";
import { LoginPage } from "@/presentation/pages/login-page";
import { TableSkeleton } from "@/presentation/components/states";

const CatalogDirectPage = lazy(() =>
  import("@/presentation/pages/catalog-direct-page").then((module) => ({
    default: module.CatalogDirectPage,
  })),
);
const DashboardPage = lazy(() =>
  import("@/presentation/pages/dashboard-page").then((module) => ({
    default: module.DashboardPage,
  })),
);
const InventoryPage = lazy(() =>
  import("@/presentation/pages/inventory-page").then((module) => ({
    default: module.InventoryPage,
  })),
);
const MediaPage = lazy(() =>
  import("@/presentation/pages/media-page").then((module) => ({
    default: module.MediaPage,
  })),
);
const OrdersPage = lazy(() =>
  import("@/presentation/pages/orders-page").then((module) => ({
    default: module.OrdersPage,
  })),
);
const ProductsPage = lazy(() =>
  import("@/presentation/pages/products-page").then((module) => ({
    default: module.ProductsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/presentation/pages/settings-page").then((module) => ({
    default: module.SettingsPage,
  })),
);
const UsersPage = lazy(() =>
  import("@/presentation/pages/users-page").then((module) => ({
    default: module.UsersPage,
  })),
);

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Refine
          accessControlProvider={accessControlProvider}
          authProvider={authProvider}
          dataProvider={dataProvider(supabaseClient)}
          notificationProvider={notificationProvider}
          options={{
            disableTelemetry: true,
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
          }}
          resources={resources}
          routerProvider={routerProvider}
        >
          <Suspense fallback={<div className="p-6"><TableSkeleton /></div>}>
          <Routes>
            <Route
              element={
                <Authenticated
                  fallback={<Navigate replace to="/login" />}
                  key="protected"
                >
                  <AppShell />
                </Authenticated>
              }
            >
              <Route element={<DashboardPage />} index />
              <Route path="brands">
                <Route element={<CatalogDirectPage kind="brands" />} index />
                <Route element={<CatalogDirectPage kind="brands" mode="create" />} path="create" />
                <Route element={<CatalogDirectPage kind="brands" mode="edit" />} path="edit/:id" />
                <Route element={<CatalogDirectPage kind="brands" mode="show" />} path="show/:id" />
              </Route>
              <Route path="categories">
                <Route element={<CatalogDirectPage kind="categories" />} index />
                <Route element={<CatalogDirectPage kind="categories" mode="create" />} path="create" />
                <Route element={<CatalogDirectPage kind="categories" mode="edit" />} path="edit/:id" />
                <Route element={<CatalogDirectPage kind="categories" mode="show" />} path="show/:id" />
              </Route>
              <Route path="products">
                <Route element={<ProductsPage />} index />
                <Route element={<ProductsPage mode="create" />} path="create" />
                <Route element={<ProductsPage mode="edit" />} path="edit/:id" />
                <Route element={<ProductsPage mode="show" />} path="show/:id" />
              </Route>
              <Route element={<MediaPage />} path="media" />
              <Route element={<InventoryPage />} path="inventory" />
              <Route path="orders">
                <Route element={<OrdersPage />} index />
                <Route element={<OrdersPage show />} path="show/:id" />
              </Route>
              <Route element={<SettingsPage />} path="settings" />
              <Route element={<UsersPage />} path="users" />
              <Route element={<Navigate replace to="/" />} path="*" />
            </Route>
            <Route
              element={
                <Authenticated fallback={<LoginPage />} key="login">
                  <Navigate replace to="/" />
                </Authenticated>
              }
              path="/login"
            />
          </Routes>
          </Suspense>
          <UnsavedChangesNotifier />
          <DocumentTitleHandler handler={({ resource }) => `${resource?.meta?.label ?? "Dashboard"} | Kiosk Admin`} />
          <Toaster richColors />
        </Refine>
      </TooltipProvider>
    </BrowserRouter>
  );
}
