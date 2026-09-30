"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ImagePlusIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  attachImageAction,
  removeImageAction,
  reorderImagesAction,
  requestImageUploadAction,
} from "../image-actions";
import {
  IMAGE_ACCEPT,
  makeMain,
  MAX_IMAGES,
  moveImage,
  validateImageFile,
} from "../images";

type GalleryImage = { key: string; url: string };
type Upload = {
  id: string;
  name: string;
  preview: string;
  progress: number;
  error?: string;
};

/** Browser → S3 with the presigned fields, reporting progress. */
function postToS3(
  target: { url: string; fields: Record<string, string> },
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(target.fields)) {
      form.append(name, value);
    }
    form.append("file", file);
    const request = new XMLHttpRequest();
    request.open("POST", target.url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () =>
      request.status < 300 ? resolve() : reject(new Error("upload"));
    request.onerror = () => reject(new Error("network"));
    request.send(form);
  });
}

export function ProductGallery({
  productId,
  version,
  images,
  canEdit,
  enabled,
}: {
  productId: string;
  version: number;
  images: GalleryImage[];
  canEdit: boolean;
  enabled: boolean;
}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // Every change bumps the version; the queue must always send the latest.
  const versionRef = useRef(version);
  useEffect(() => {
    versionRef.current = Math.max(versionRef.current, version);
  }, [version]);

  // The new order shows at once; the server's order replaces it on response.
  const [shown, setShown] = useOptimistic(images);

  const busy = pending || uploads.some((u) => !u.error);
  const room =
    MAX_IMAGES - shown.length - uploads.filter((u) => !u.error).length;
  const keys = shown.map((image) => image.key);

  const patch = (id: string, change: Partial<Upload>) =>
    setUploads((list) =>
      list.map((u) => (u.id === id ? { ...u, ...change } : u)),
    );
  const dismiss = (id: string) =>
    setUploads((list) => {
      const upload = list.find((u) => u.id === id);
      if (upload) URL.revokeObjectURL(upload.preview);
      return list.filter((u) => u.id !== id);
    });

  async function uploadOne(file: File, id: string) {
    const signed = await requestImageUploadAction(productId, {
      type: file.type,
      size: file.size,
    });
    if (!signed.ok) return patch(id, { error: signed.message });
    try {
      await postToS3(signed.data, file, (progress) => patch(id, { progress }));
    } catch {
      return patch(id, {
        error: "L'envoi a échoué. Vérifiez votre connexion.",
      });
    }
    const attached = await attachImageAction(
      productId,
      versionRef.current,
      signed.data.key,
    );
    if (!attached.ok) return patch(id, { error: attached.message });
    versionRef.current = attached.data.version;
    dismiss(id);
  }

  function addFiles(files: FileList | File[]) {
    const accepted: { file: File; id: string }[] = [];
    let slots = room;
    for (const file of Array.from(files)) {
      const problem = validateImageFile(file);
      if (problem) {
        toast.error(`${file.name} : ${problem}`);
        continue;
      }
      if (slots <= 0) {
        toast.error(`${MAX_IMAGES} images maximum par produit.`);
        break;
      }
      slots--;
      accepted.push({ file, id: crypto.randomUUID() });
    }
    if (accepted.length === 0) return;
    setUploads((list) => [
      ...list,
      ...accepted.map(({ file, id }) => ({
        id,
        name: file.name,
        preview: URL.createObjectURL(file),
        progress: 0,
      })),
    ]);
    // One after the other: each attach needs the version left by the last.
    startTransition(async () => {
      for (const { file, id } of accepted) await uploadOne(file, id);
    });
  }

  function reorder(next: string[]) {
    startTransition(async () => {
      setShown(next.map((key) => shown.find((image) => image.key === key)!));
      const result = await reorderImagesAction(
        productId,
        versionRef.current,
        next,
      );
      if (!result.ok) toast.error(result.message);
      else versionRef.current = result.data.version;
    });
  }

  async function remove(key: string) {
    const result = await removeImageAction(productId, versionRef.current, key);
    if (result.ok) {
      versionRef.current = result.data.version;
      toast.success("Image supprimée.");
    }
    return result;
  }

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Le stockage des images n&apos;est pas configuré.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-md",
        dragging && "outline-2 outline-offset-4 outline-primary outline-dashed",
      )}
      onDragOver={(event) => {
        if (!canEdit || room <= 0) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (!canEdit) return;
        event.preventDefault();
        setDragging(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      {shown.length === 0 && uploads.length === 0 && !canEdit ? (
        <p className="text-sm text-muted-foreground">Aucune image.</p>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {shown.map((image, index) => (
          <li key={image.key} className="min-w-0 space-y-2">
            <div className="relative aspect-square overflow-hidden rounded-md border bg-surface-muted">
              <Image
                src={image.url}
                alt={`Image ${index + 1} du produit`}
                fill
                sizes="(min-width: 1280px) 180px, (min-width: 640px) 30vw, 45vw"
                className="object-cover"
              />
              {index === 0 ? (
                <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium shadow-sm">
                  Principale
                </span>
              ) : null}
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Déplacer l'image ${index + 1} vers la gauche`}
                    disabled={busy || index === 0}
                    onClick={() => reorder(moveImage(keys, image.key, -1))}
                  >
                    <ArrowLeftIcon aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Déplacer l'image ${index + 1} vers la droite`}
                    disabled={busy || index === shown.length - 1}
                    onClick={() => reorder(moveImage(keys, image.key, 1))}
                  >
                    <ArrowRightIcon aria-hidden />
                  </Button>
                  {index > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Définir l'image ${index + 1} comme principale`}
                      disabled={busy}
                      onClick={() => reorder(makeMain(keys, image.key))}
                    >
                      <StarIcon aria-hidden />
                    </Button>
                  ) : null}
                </div>
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Supprimer l'image ${index + 1}`}
                      disabled={busy}
                    >
                      <Trash2Icon aria-hidden />
                    </Button>
                  }
                  title="Supprimer cette image ?"
                  description="Le fichier est effacé du stockage. Cette action est définitive."
                  confirmLabel="Supprimer l'image"
                  onConfirm={() => remove(image.key)}
                />
              </div>
            ) : null}
          </li>
        ))}

        {uploads.map((upload) => (
          <li key={upload.id} className="min-w-0 space-y-2">
            <div className="relative aspect-square overflow-hidden rounded-md border bg-surface-muted">
              {/* A local blob preview: next/image cannot optimise it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={upload.preview}
                alt=""
                className={cn(
                  "size-full object-cover",
                  upload.error ? "opacity-40" : "opacity-70",
                )}
              />
              {upload.error ? null : (
                <div className="absolute inset-x-2 bottom-2">
                  <div
                    role="progressbar"
                    aria-label={`Envoi de ${upload.name}`}
                    aria-valuenow={upload.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1.5 overflow-hidden rounded-full bg-surface/80"
                  >
                    <div
                      className="h-full bg-primary transition-[width]"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            {upload.error ? (
              <div className="flex items-start justify-between gap-2">
                <p role="alert" className="text-xs text-danger">
                  {upload.error}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Retirer ${upload.name}`}
                  onClick={() => dismiss(upload.id)}
                >
                  <XIcon aria-hidden />
                </Button>
              </div>
            ) : (
              <p className="truncate text-xs text-muted-foreground tabular-nums">
                {upload.progress < 100
                  ? `${upload.progress} %`
                  : "Enregistrement…"}
              </p>
            )}
          </li>
        ))}

        {canEdit && room > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-surface px-3 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <ImagePlusIcon className="size-5" aria-hidden />
              Ajouter des images
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              aria-label="Ajouter des images"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </li>
        ) : null}
      </ul>

      {canEdit ? (
        <p className="text-xs text-muted-foreground">
          JPEG, PNG ou WebP, 5 Mo maximum, {MAX_IMAGES} images au plus. Glissez
          des fichiers ici ou utilisez le bouton. La première image est
          l&apos;image principale.
        </p>
      ) : null}
    </div>
  );
}
