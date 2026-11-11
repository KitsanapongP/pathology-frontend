import { describe, expect, it } from "vitest";
import { blankParts, visibleExaminationParts, unlockedExaminationParts, mayCompleteExaminationPart, maySubmitExamination, completedPartsAfterEdit } from "@/lib/examination-data";

describe("visible specimen Parts", () => {
  it("starts a blank case with only Part A while retaining the underlying slots", () => {
    const parts = blankParts();
    expect(visibleExaminationParts(parts, [], []).map(part => part.id)).toEqual(["A"]);
    expect(parts.map(part => part.id)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("never hides a saved transcript or audio-only Part in an older draft", () => {
    const parts = blankParts();
    parts[4].lines.push({ id: "synthetic-line", text: "Synthetic saved text", time: 0 });
    const visible = visibleExaminationParts(parts, ["C"], []);
    expect(visible.map(part => part.id)).toEqual(["A", "C", "E"]);
    expect(visible[2]).toBe(parts[4]);
    expect(visible[2].lines[0].text).toBe("Synthetic saved text");
  });

  it("keeps explicitly added empty Parts visible in alphabetical order", () => {
    expect(visibleExaminationParts(blankParts(), [], ["D", "B", "unknown"]).map(part => part.id)).toEqual(["A", "B", "D"]);
  });
});


describe("Part completion", () => {
  it("unlocks the next Part only after completion; an empty next Part is optional", () => {
    const parts = blankParts();
    parts[0].lines.push({ id: "a", text: "Synthetic A", time: 0 });
    expect(unlockedExaminationParts(parts, [])).toEqual(["A"]);
    expect(mayCompleteExaminationPart(parts, [], [], "A")).toBe(true);
    expect(maySubmitExamination(parts, [], [])).toBe(false);
    expect(unlockedExaminationParts(parts, ["A"])).toEqual(["A", "B"]);
    expect(mayCompleteExaminationPart(parts, [], ["A"], "B")).toBe(false);
    expect(maySubmitExamination(parts, [], ["A"])).toBe(true);
    parts[1].lines.push({ id: "b", text: "Synthetic B", time: 0 });
    expect(maySubmitExamination(parts, [], ["A"])).toBe(false);
    expect(mayCompleteExaminationPart(parts, [], [], "B")).toBe(false);
    expect(maySubmitExamination(parts, [], ["A", "B"])).toBe(true);
  });
  it("invalidates only changed Parts on editing or undo", () => {
    const parts = blankParts();
    const next = structuredClone(parts);
    next[0].lines.push({ id: "edited", text: "Synthetic edit", time: 0 });
    expect(completedPartsAfterEdit(parts, next, ["A", "B"])).toEqual(["B"]);
    expect(completedPartsAfterEdit(next, parts, ["A", "B"])).toEqual(["B"]);
  });
  it("includes audio-only Parts and rejects a wholly empty report", () => {
    expect(maySubmitExamination(blankParts(), [], [])).toBe(false);
    expect(mayCompleteExaminationPart(blankParts(), ["A"], [], "A")).toBe(true);
    expect(maySubmitExamination(blankParts(), ["A", "B"], ["A"])).toBe(false);
  });
});
