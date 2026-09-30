import { Badge, type BadgeTone } from "@/components/ui/badge";
import { AVAILABILITY_LABELS, type Availability } from "../types";

const TONES: Record<Availability, BadgeTone> = {
  OK: "success",
  INSUFFICIENT: "warning",
  OUT: "danger",
  ARCHIVED: "neutral",
  DELETED: "neutral",
};

export function AvailabilityBadge({ value }: { value: Availability }) {
  return <Badge tone={TONES[value]}>{AVAILABILITY_LABELS[value]}</Badge>;
}

export function AbandonedBadge() {
  return <Badge tone="warning">Abandonné</Badge>;
}

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});
export const formatDateTime = (iso: string) =>
  iso ? dateTime.format(new Date(iso)) : "—";
