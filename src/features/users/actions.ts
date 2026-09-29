"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, type FormActionState } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/dal";
import {
  adminCreateSchema,
  roleChangeSchema,
  userUpdateSchema,
} from "./schemas";
import {
  anonymizeUser,
  changeUserRole,
  createAdmin,
  resetUserPassword,
  setUserStatus,
  updateUser,
} from "./service";

type Outcome = { ok: true; message: string } | { ok: false; message: string };
type PasswordOutcome =
  | { ok: true; message: string; temporaryPassword?: string }
  | { ok: false; message: string };

function refresh(userId?: string) {
  revalidatePath("/admin/users");
  if (userId) revalidatePath(`/admin/users/${userId}`);
}

const read = (formData: FormData, fields: string[]) =>
  Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));

// Business errors shown under a form field.
const FIELD_OF_ERROR: Record<string, string> = { EMAIL_TAKEN: "email" };

function formError(error: unknown, values: Record<string, string>) {
  const result = failure(error);
  const field = result.code ? FIELD_OF_ERROR[result.code] : undefined;
  return field
    ? { fieldErrors: { [field]: [result.message] }, values }
    : { message: result.message, values };
}

export type UserFormState = FormActionState<"name" | "email" | "phone">;

export async function updateUserAction(
  _previous: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await requireAdmin("users:write");
  const values = read(formData, ["name", "email", "phone"]);
  const parsed = userUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const id = String(formData.get("id") ?? "");
  try {
    await updateUser(session, id, Number(formData.get("version")), parsed.data);
    refresh(id);
    return { ok: true, id, message: "Compte enregistré." };
  } catch (error) {
    return formError(error, values);
  }
}

export type CreateAdminState =
  | Exclude<FormActionState<"name" | "email" | "role">, { ok: true }>
  | {
      ok: true;
      id: string;
      message: string;
      temporaryPassword: string;
      name: string;
    };

export async function createAdminAction(
  _previous: CreateAdminState,
  formData: FormData,
): Promise<CreateAdminState> {
  const session = await requireAdmin("admins:manage");
  const values = read(formData, ["name", "email", "role"]);
  const parsed = adminCreateSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  try {
    const { user, temporaryPassword } = await createAdmin(session, parsed.data);
    refresh();
    return {
      ok: true,
      id: user.id,
      name: user.name,
      message: "Administrateur créé.",
      temporaryPassword,
    };
  } catch (error) {
    return formError(error, values);
  }
}

export async function setUserStatusAction(
  id: string,
  version: number,
  status: "ACTIVE" | "SUSPENDED",
): Promise<Outcome> {
  const session = await requireAdmin("users:write");
  try {
    await setUserStatus(session, id, version, status);
    refresh(id);
    return {
      ok: true,
      message: status === "SUSPENDED" ? "Compte suspendu." : "Compte réactivé.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function changeUserRoleAction(
  id: string,
  version: number,
  role: string,
): Promise<PasswordOutcome> {
  const session = await requireAdmin("admins:manage");
  const parsed = roleChangeSchema.safeParse({ role });
  if (!parsed.success) return { ok: false, message: "Choisissez un rôle." };
  try {
    const { temporaryPassword } = await changeUserRole(
      session,
      id,
      version,
      parsed.data.role,
    );
    refresh(id);
    return { ok: true, message: "Rôle modifié.", temporaryPassword };
  } catch (error) {
    return failure(error);
  }
}

export async function resetPasswordAction(
  id: string,
  version: number,
): Promise<PasswordOutcome> {
  const session = await requireAdmin("admins:manage");
  try {
    const { temporaryPassword } = await resetUserPassword(session, id, version);
    refresh(id);
    return {
      ok: true,
      message: "Mot de passe réinitialisé.",
      temporaryPassword,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function anonymizeUserAction(
  id: string,
  version: number,
): Promise<Outcome> {
  const session = await requireAdmin("users:delete");
  try {
    await anonymizeUser(session, id, version);
    refresh(id);
    return { ok: true, message: "Compte anonymisé." };
  } catch (error) {
    return failure(error);
  }
}
