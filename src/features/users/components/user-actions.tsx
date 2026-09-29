"use client";

import {
  KeyRoundIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  UserXIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  anonymizeUserAction,
  resetPasswordAction,
  setUserStatusAction,
} from "../actions";
import type { UserAction } from "../policy";
import type { UserRole, UserStatus } from "../types";
import { EditUserDialog } from "./edit-user-dialog";
import { RoleDialog } from "./role-dialog";
import { TemporaryPassword } from "./temporary-password";

type Props = {
  user: {
    id: string;
    version: number;
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    status: UserStatus;
  };
  /** Computed on the server with canManageUser; the server checks again. */
  allowed: Partial<Record<UserAction, boolean>>;
};

async function notify<T extends { ok: boolean; message: string }>(
  promise: Promise<T>,
) {
  const result = await promise;
  if (result.ok) toast.success(result.message);
  return result;
}

export function UserActions({ user, allowed }: Props) {
  const [password, setPassword] = useState<string>();
  const suspended = user.status === "SUSPENDED";

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.edit ? <EditUserDialog user={user} /> : null}
      {allowed.changeRole ? <RoleDialog user={user} /> : null}

      {suspended && allowed.reactivate ? (
        <ConfirmDialog
          tone="primary"
          trigger={
            <Button variant="outline">
              <PlayCircleIcon aria-hidden />
              Réactiver
            </Button>
          }
          title={`Réactiver le compte de ${user.name} ?`}
          description="La personne pourra de nouveau se connecter."
          confirmLabel="Réactiver"
          onConfirm={() =>
            notify(setUserStatusAction(user.id, user.version, "ACTIVE"))
          }
        />
      ) : null}
      {!suspended && allowed.suspend ? (
        <ConfirmDialog
          trigger={
            <Button variant="outline">
              <PauseCircleIcon aria-hidden />
              Suspendre
            </Button>
          }
          title={`Suspendre le compte de ${user.name} ?`}
          description="La personne est déconnectée immédiatement et ne peut plus se connecter jusqu'à sa réactivation."
          confirmLabel="Suspendre"
          onConfirm={() =>
            notify(setUserStatusAction(user.id, user.version, "SUSPENDED"))
          }
        />
      ) : null}

      {allowed.resetPassword ? (
        <ConfirmDialog
          tone="primary"
          trigger={
            <Button variant="outline">
              <KeyRoundIcon aria-hidden />
              Réinitialiser le mot de passe
            </Button>
          }
          title={`Réinitialiser le mot de passe de ${user.name} ?`}
          description="Un mot de passe temporaire est généré et ses sessions sont fermées. Il devra le changer à sa prochaine connexion."
          confirmLabel="Réinitialiser"
          onConfirm={async () => {
            const result = await notify(
              resetPasswordAction(user.id, user.version),
            );
            if (result.ok && result.temporaryPassword) {
              setPassword(result.temporaryPassword);
            }
            return result;
          }}
        />
      ) : null}

      {allowed.anonymize ? (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" className="text-danger hover:bg-danger/10">
              <UserXIcon aria-hidden />
              Anonymiser
            </Button>
          }
          title={`Anonymiser le compte de ${user.name} ?`}
          description="Irréversible. Nom, email, téléphone et mot de passe sont effacés, le panier et la wishlist vidés. L'historique est conservé sans données personnelles."
          confirmLabel="Anonymiser définitivement"
          confirmationText={user.email}
          onConfirm={() => notify(anonymizeUserAction(user.id, user.version))}
        />
      ) : null}

      <Dialog
        open={password !== undefined}
        onOpenChange={(open) => {
          if (!open) setPassword(undefined);
        }}
      >
        <DialogContent>
          <DialogTitle>Mot de passe temporaire</DialogTitle>
          {password ? (
            <TemporaryPassword
              name={user.name}
              password={password}
              onDone={() => setPassword(undefined)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
