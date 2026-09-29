import { MobileNav } from "./mobile-nav";

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-surface/90 px-4 backdrop-blur lg:px-8">
      <MobileNav />
      <span className="font-semibold tracking-tight lg:hidden">
        Tynoc Admin
      </span>
      {/* Account menu and sign-out arrive with authentication (Phase 2). */}
    </header>
  );
}
