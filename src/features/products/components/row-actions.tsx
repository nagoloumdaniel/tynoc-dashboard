"use client";

import { PackagePlusIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProductListItem } from "../types";
import { StockDialog } from "./stock-dialog";

export function RowActions({ product }: { product: ProductListItem }) {
  const edit = `Modifier ${product.name}`;
  const stock = `Ajuster le stock de ${product.name}`;
  return (
    <div className="flex justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="icon" aria-label={edit}>
            <Link href={`/admin/products/${product.id}/edit`}>
              <PencilIcon aria-hidden />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Modifier</TooltipContent>
      </Tooltip>
      <StockDialog
        product={product}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label={stock}
            title="Ajuster le stock"
          >
            <PackagePlusIcon aria-hidden />
          </Button>
        }
      />
    </div>
  );
}
