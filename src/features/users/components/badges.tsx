import { Badge, type BadgeTone } from "@/components/ui/badge";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type UserRole,
  type UserStatus,
} from "../types";

const ROLE_TONES: Record<UserRole, BadgeTone> = {
  CUSTOMER: "neutral",
  VIEWER: "primary",
  ADMIN: "primary",
  SUPER_ADMIN: "primary",
};

const STATUS_TONES: Record<UserStatus, BadgeTone> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DELETED: "neutral",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge tone={ROLE_TONES[role]}>{USER_ROLE_LABELS[role]}</Badge>;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]}>{USER_STATUS_LABELS[status]}</Badge>
  );
}

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary",
        size === "md" ? "size-9 text-xs" : "size-12 text-sm",
      )}
    >
      {initials(name)}
    </span>
  );
}
