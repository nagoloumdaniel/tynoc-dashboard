import { NotificationBell } from "@/features/notifications/components/notification-bell";
import type { Session } from "@/lib/auth/session";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";

export function Topbar({ session }: { session: Session }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-surface/90 px-4 backdrop-blur lg:px-8">
      <MobileNav />
      <span className="font-semibold tracking-tight lg:hidden">
        Tynoc Admin
      </span>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <AccountMenu
          name={session.name}
          email={session.email}
          role={session.role}
        />
      </div>
    </header>
  );
}
