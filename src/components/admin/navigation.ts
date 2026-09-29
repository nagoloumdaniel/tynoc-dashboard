import {
  ActivityIcon,
  HeartIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingCartIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboardIcon },
  { label: "Produits", href: "/admin/products", icon: PackageIcon },
  { label: "Catégories", href: "/admin/categories", icon: TagsIcon },
  { label: "Utilisateurs", href: "/admin/users", icon: UsersIcon },
  { label: "Paniers", href: "/admin/carts", icon: ShoppingCartIcon },
  { label: "Wishlists", href: "/admin/wishlists", icon: HeartIcon },
  { label: "Activité", href: "/admin/activity", icon: ActivityIcon },
  { label: "Paramètres", href: "/admin/settings", icon: SettingsIcon },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
