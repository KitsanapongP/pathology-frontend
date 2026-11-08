import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import PortalFrame from "@/components/portal-frame";

const route = vi.hoisted(() => ({ pathname: "/portal/examinations" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/components/workspace-header", () => ({ default: () => <header>Workspace header</header> }));

it.each(["/portal/examinations", "/portal/examinations/"])("uses the workstation shell for %s", pathname => {
  route.pathname = pathname;
  const { container } = render(<PortalFrame><main>Report</main></PortalFrame>);
  expect(screen.queryByRole("banner")).toBeNull();
  expect(container.firstChild).toHaveClass("portal-frame--station");
});

it.each(["/portal/", "/portal/requests/", "/portal/examinations-other/"])("keeps the shared header for %s", pathname => {
  route.pathname = pathname;
  const { container } = render(<PortalFrame><main>Other module</main></PortalFrame>);
  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(container.firstChild).not.toHaveClass("portal-frame--station");
});
