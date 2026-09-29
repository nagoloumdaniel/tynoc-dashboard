import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";

function setup(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn(async () => ({ ok: true as const }));
  render(
    <ConfirmDialog
      trigger={<Button>Supprimer</Button>}
      title="Supprimer « Chaise » ?"
      description="Cette action est définitive."
      confirmLabel="Supprimer définitivement"
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, user: userEvent.setup() };
}

describe("ConfirmDialog", () => {
  it("confirms and closes", async () => {
    const { onConfirm, user } = setup();
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Cette action est définitive.",
    );
    await user.click(
      screen.getByRole("button", { name: "Supprimer définitivement" }),
    );

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("requires typing the expected text before confirming", async () => {
    const { onConfirm, user } = setup({ confirmationText: "CHS-001" });
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    const confirm = screen.getByRole("button", {
      name: "Supprimer définitivement",
    });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/Tapez CHS-001/), "CHS-00");
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/Tapez CHS-001/), "1");
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("stays open and shows the error when the action fails", async () => {
    const { user } = setup({
      onConfirm: async () => ({
        ok: false,
        message: "Produit encore utilisé.",
      }),
    });
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await user.click(
      screen.getByRole("button", { name: "Supprimer définitivement" }),
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Produit encore utilisé.",
    );
  });
});
