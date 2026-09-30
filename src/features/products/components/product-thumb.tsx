import { PackageIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-10", md: "size-12" } as const;
const PIXELS = { sm: 40, md: 48 } as const;

/** Main image of a product, or a neutral tile; decorative next to the name. */
export function ProductThumb({
  src,
  size = "sm",
}: {
  src: string | null;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-md border bg-surface-muted text-muted-foreground",
        SIZES[size],
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={`${PIXELS[size]}px`}
          className="object-cover"
        />
      ) : (
        <PackageIcon className="size-4" />
      )}
    </span>
  );
}
