"use client";

import { BellIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markNotificationsReadAction } from "../actions";
import type { NotificationItem } from "../repository";
import type { NotificationFeed } from "../service";
import { timeAgo } from "../time";

const POLL_MS = 15_000;
const KEEP = 20;

function merge(current: NotificationItem[], incoming: NotificationItem[]) {
  const byId = new Map(current.map((n) => [n.id, n]));
  for (const n of incoming) byId.set(n.id, n);
  return [...byId.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, KEEP);
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // Seen ids decide what is new; the first load never raises toasts.
  const seen = useRef<Set<string> | null>(null);
  const latest = useRef<string | undefined>(undefined);

  const poll = useEffectEvent(async () => {
    if (document.visibilityState === "hidden") return;
    const query = latest.current
      ? `?since=${encodeURIComponent(latest.current)}`
      : "";
    let response: Response;
    try {
      response = await fetch(`/api/notifications${query}`, {
        cache: "no-store",
      });
    } catch {
      return; // Offline: the next tick tries again.
    }
    if (response.status === 401) {
      router.refresh(); // Expired session: the page sends the admin to /login.
      return;
    }
    if (!response.ok) return;
    const feed = (await response.json()) as NotificationFeed;

    const firstLoad = seen.current === null;
    const known = seen.current ?? new Set<string>();
    const fresh = feed.items.filter((n) => !known.has(n.id));
    for (const n of fresh) known.add(n.id);
    seen.current = known;
    if (feed.items[0] && feed.items[0].createdAt > (latest.current ?? "")) {
      latest.current = feed.items[0].createdAt;
    }

    if (!firstLoad) {
      for (const n of fresh.filter((n) => n.severity === "important")) {
        toast.warning(n.title, {
          description: n.body,
          action: { label: "Voir", onClick: () => router.push(n.href) },
        });
      }
    }
    setItems((current) => merge(current, feed.items));
    setUnread(feed.unread);
    setReadAt(feed.readAt);
  });

  useEffect(() => {
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    // Back on the tab: catch up at once instead of waiting for the tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  function markAllRead() {
    startTransition(async () => {
      const result = await markNotificationsReadAction();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setReadAt(result.data.readAt);
      setUnread(0);
    });
  }

  const label =
    unread > 0
      ? `Notifications, ${unread >= 99 ? "99 ou plus" : unread} non lue(s)`
      : "Notifications";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={label}
        className="relative grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground data-[state=open]:bg-surface-muted"
      >
        <BellIcon className="size-5" aria-hidden />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-danger-foreground tabular-nums"
          >
            {unread >= 99 ? "99+" : unread}
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-lg border bg-surface text-foreground shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending || unread === 0}
              onClick={markAllRead}
            >
              Tout marquer comme lu
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Aucune notification.
            </p>
          ) : (
            <ul className="divide-y overflow-y-auto">
              {items.map((n) => {
                const isUnread = !readAt || n.createdAt > readAt;
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 hover:bg-surface-muted"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          isUnread
                            ? n.severity === "important"
                              ? "bg-danger"
                              : "bg-primary"
                            : "bg-transparent",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {n.title}
                          {isUnread ? (
                            <span className="sr-only"> (non lue)</span>
                          ) : null}
                        </span>
                        <span className="block text-sm break-words text-muted-foreground">
                          {n.body}
                        </span>
                        <time
                          dateTime={n.createdAt}
                          className="mt-1 block text-xs text-muted-foreground"
                        >
                          {timeAgo(n.createdAt)}
                        </time>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
