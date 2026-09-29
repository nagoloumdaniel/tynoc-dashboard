import { cookies } from "next/headers";
import { Sidebar } from "@/components/admin/sidebar";
import { SIDEBAR_COOKIE } from "@/components/admin/sidebar-cookie";
import { Topbar } from "@/components/admin/topbar";
import { requireAdmin } from "@/lib/auth/dal";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [session, cookieStore] = await Promise.all([requireAdmin(), cookies()]);
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "true";

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Aller au contenu
      </a>
      <Sidebar defaultCollapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar session={session} />
        <main
          id="main"
          className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
