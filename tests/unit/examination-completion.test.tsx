import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ExaminationWorkflow from "@/components/examination-workflow";
import { blankParts } from "@/lib/examination-data";
import { writeExaminationDraft } from "@/lib/examination-drafts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/examination-drafts", () => ({ readExaminationDraft: vi.fn(), writeExaminationDraft: vi.fn(), resetExaminationTestDraft: vi.fn() }));
vi.mock("@/hooks/use-examination-focus", () => ({ useExaminationFocus: () => ({ target: { label: "", confirm: false, completePart: true, adjusting: false }, getTarget: () => ({ completePart: true }), selectTarget: vi.fn(), move: vi.fn(), activate: vi.fn(), leaveAdjustment: () => false }) }));
vi.mock("@/hooks/use-examination-voice", () => ({ useExaminationVoice: () => ({ mode: null, capturing: false, inputStream: null, seconds: 0, start: vi.fn(), stop: vi.fn() }) }));

beforeEach(async () => {
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  HTMLDialogElement.prototype.close = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn();
  const { readExaminationDraft } = await import("@/lib/examination-drafts");
  const parts = blankParts();
  parts[0].lines.push({ id: "synthetic", text: "Synthetic report", time: 0 });
  vi.mocked(readExaminationDraft).mockResolvedValue({ version: 2, requestId: "REQ-2569-0038", parts, clips: [], confirmed: false, savedAt: "2026-11-08" });
  vi.mocked(writeExaminationDraft).mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });

async function openReport() {
  render(<ExaminationWorkflow />);
  fireEvent.change(screen.getByRole("textbox", { name: "เลขคำร้องหรือ HN" }), { target: { value: "0038" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "ค้นหา" })));
  fireEvent.click(screen.getByRole("button", { name: "เริ่มบันทึก" }));
}
async function hold(ms: number) {
  const button = screen.getByRole("button", { name: "บันทึก Part A" });
  fireEvent.keyDown(button, { key: "Enter" });
  act(() => vi.advanceTimersByTime(ms));
  await act(async () => fireEvent.keyUp(button, { key: "Enter" }));
}

it("persists completion before advancing; empty B does not block the review action", async () => {
  await openReport();
  await hold(2999);
  expect(screen.queryByRole("article", { name: "ผลตรวจ Part B" })).toBeNull();
  await hold(3000);
  expect(writeExaminationDraft).toHaveBeenLastCalledWith(expect.objectContaining({ completedPartIds: ["A"] }));
  expect(screen.getByRole("article", { name: "ผลตรวจ Part B" })).toBeInTheDocument();
  expect(within(screen.getByRole("navigation")).getByRole("button", { name: "ตรวจสอบและส่งผล" })).toBeEnabled();
});

it("keeps A open and blocks review when saving completion fails", async () => {
  await openReport();
  vi.mocked(writeExaminationDraft).mockImplementation(async draft => { if (draft.completedPartIds?.length) throw new Error("Synthetic storage failure"); });
  await hold(3000);
  expect(screen.getByRole("article", { name: "ผลตรวจ Part A" })).toBeInTheDocument();
  expect(screen.queryByRole("article", { name: "ผลตรวจ Part B" })).toBeNull();
  expect(screen.getByRole("button", { name: "ตรวจสอบและส่งผล" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("บันทึกไม่สำเร็จ");
});
