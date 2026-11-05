import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import LoginForm from "@/components/login-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

it("keeps password visibility reversible without changing the entered value", () => {
  render(<LoginForm />);
  const password = screen.getByLabelText("รหัสผ่าน");
  fireEvent.change(password, { target: { value: "synthetic-test-value" } });
  expect(password).toHaveAttribute("type", "password");
  fireEvent.click(screen.getByRole("button", { name: "แสดงรหัสผ่าน" }));
  expect(password).toHaveAttribute("type", "text");
  expect(password).toHaveValue("synthetic-test-value");
  fireEvent.click(screen.getByRole("button", { name: "ซ่อนรหัสผ่าน" }));
  expect(password).toHaveAttribute("type", "password");
});
