import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./pagination";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/admin/products",
  useSearchParams: () => new URLSearchParams("q=chaise&page=2"),
}));

describe("Pagination", () => {
  it("shows the range and disables Previous on the first page", () => {
    render(<Pagination page={1} pageCount={3} total={45} pageSize={20} />);

    expect(screen.getByText("1–20 sur 45")).toBeInTheDocument();
    expect(
      screen.getByText("Précédent").closest("[aria-disabled]"),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute(
      "href",
      "/admin/products?q=chaise&page=2",
    );
  });

  it("keeps the filters and drops page=1 from the URL", () => {
    render(<Pagination page={2} pageCount={3} total={45} pageSize={20} />);

    expect(screen.getByText("21–40 sur 45")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Précédent" })).toHaveAttribute(
      "href",
      "/admin/products?q=chaise",
    );
  });

  it("renders nothing without results", () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} total={0} pageSize={20} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
