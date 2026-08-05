import {
  BoxesIcon,
  ClipboardListIcon,
  ImagesIcon,
  PackageIcon,
  SettingsIcon,
  ShapesIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react";

export const resources = [
  {
    name: "brands",
    list: "/brands",
    create: "/brands/create",
    edit: "/brands/edit/:id",
    show: "/brands/show/:id",
    meta: { label: "Brands", icon: <TagsIcon /> },
  },
  {
    name: "categories",
    list: "/categories",
    create: "/categories/create",
    edit: "/categories/edit/:id",
    show: "/categories/show/:id",
    meta: { label: "Categories", icon: <ShapesIcon /> },
  },
  {
    name: "products",
    list: "/products",
    create: "/products/create",
    edit: "/products/edit/:id",
    show: "/products/show/:id",
    meta: { label: "Products", icon: <PackageIcon /> },
  },
  {
    name: "flavors",
    meta: { label: "Flavors", hide: true },
  },
  {
    name: "media",
    list: "/media",
    meta: { label: "Media", icon: <ImagesIcon /> },
  },
  {
    name: "inventory",
    list: "/inventory",
    meta: { label: "Inventory", icon: <BoxesIcon /> },
  },
  {
    name: "inventory_adjustments",
    meta: { label: "Inventory adjustments", hide: true },
  },
  {
    name: "orders",
    list: "/orders",
    show: "/orders/show/:id",
    meta: { label: "Orders", icon: <ClipboardListIcon /> },
  },
  {
    name: "users",
    list: "/users",
    meta: { label: "Users", icon: <UsersIcon /> },
  },
  {
    name: "store_settings",
    list: "/settings",
    edit: "/settings",
    meta: { label: "Store settings", icon: <SettingsIcon /> },
  },
];
