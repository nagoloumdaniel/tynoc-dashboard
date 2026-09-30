import { normalizeText } from "@/lib/format";
import type { UserListQuery } from "./schemas";
import type { UserListItem } from "./types";

export const USER_PAGE_SIZE = 20;

export type UserPage = {
  items: UserListItem[];
  total: number;
  page: number;
  pageCount: number;
};

function matches(user: UserListItem, query: UserListQuery, search: string) {
  if (query.status === "current") {
    if (user.status === "DELETED") return false;
  } else if (user.status !== query.status) {
    return false;
  }
  if (query.type === "customers" && user.role !== "CUSTOMER") return false;
  if (query.type === "admins" && user.role === "CUSTOMER") return false;
  return (
    !search ||
    normalizeText(user.name).includes(search) ||
    user.email.includes(search)
  );
}

const byName = (a: UserListItem, b: UserListItem) =>
  normalizeText(a.name).localeCompare(normalizeText(b.name), "fr");

const COMPARATORS = {
  name: byName,
  createdAt: (a: UserListItem, b: UserListItem) =>
    a.createdAt.localeCompare(b.createdAt) || byName(a, b),
  "-createdAt": (a: UserListItem, b: UserListItem) =>
    b.createdAt.localeCompare(a.createdAt) || byName(a, b),
} as const;

export function filterSortPaginateUsers(
  users: UserListItem[],
  query: UserListQuery,
  pageSize = USER_PAGE_SIZE,
): UserPage {
  const search = normalizeText(query.q);
  const filtered = users
    .filter((user) => matches(user, query, search))
    .sort(COMPARATORS[query.sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(query.page, pageCount);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageCount,
  };
}
