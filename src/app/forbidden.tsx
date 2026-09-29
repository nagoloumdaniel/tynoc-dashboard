import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-sm text-center">
        <ShieldAlertIcon
          className="mx-auto mb-4 size-10 text-warning"
          aria-hidden
        />
        <h1 className="text-xl font-semibold">Accès refusé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre rôle ne permet pas d&apos;accéder à cette page. Demandez à un
          super administrateur si vous en avez besoin.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/admin">Retour au tableau de bord</Link>
        </Button>
      </div>
    </main>
  );
}
