import { describe, expect, it } from "vitest";
import { bangkokDay, emptyRequestFilters, matchesRequest } from "@/lib/request-filters";
import type { RequestRecord } from "@/lib/request-data";

// Synthetic identifiers only. The UTC timestamp crosses midnight in Bangkok.
const record: RequestRecord = {
  id: "REQ-TEST-01", category: "ส่งตรวจ", sender: "Test sender",
  fileName: "synthetic.pdf", hn: "HN-001-234", patientName: "Synthetic Example",
  uploadedAt: "2026-11-01T00:00:00Z", receivedAt: "2026-11-04T18:30:00Z",
  ocr: "สแกนแล้ว", review: "พร้อมใช้งาน",
  pathology: { an: "AN-987", accessionNumber: "P-2026-123", surgicalNumber: "SURG-TEST-456", ward: "OPD" },
};

describe("request filtering", () => {
  it("filters by Bangkok receipt day, independently of upload day", () => {
    expect(bangkokDay(record.receivedAt!)).toBe("2026-11-05");
    expect(matchesRequest(record, { ...emptyRequestFilters, from: "2026-11-05", to: "2026-11-05" })).toBe(true);
    expect(matchesRequest(record, { ...emptyRequestFilters, to: "2026-11-04" })).toBe(false);
  });
  it("requires every search word and keeps identifier namespaces separate", () => {
    expect(matchesRequest(record, { ...emptyRequestFilters, search: "example synthetic" })).toBe(true);
    expect(matchesRequest(record, { ...emptyRequestFilters, search: "example missing" })).toBe(false);
    expect(matchesRequest(record, { ...emptyRequestFilters, scope: "hn", search: "HN001234" })).toBe(true);
    expect(matchesRequest(record, { ...emptyRequestFilters, scope: "hn", search: "AN987" })).toBe(false);
  });
  it("rejects reversed ranges and unknown receipt dates when filtering by date", () => {
    expect(matchesRequest(record, { ...emptyRequestFilters, from: "2026-11-06", to: "2026-11-05" })).toBe(false);
    expect(matchesRequest({ ...record, receivedAt: "invalid" }, { ...emptyRequestFilters, from: "2026-11-01" })).toBe(false);
  });
  it("distinguishes the printed request number, Surgical Number, HN and internal ID", () => {
    expect(matchesRequest(record, { ...emptyRequestFilters, scope: "accession", search: "P2026123" })).toBe(true);
    expect(matchesRequest(record, { ...emptyRequestFilters, scope: "surgical", search: "SURGTEST456" })).toBe(true);
    expect(matchesRequest(record, { ...emptyRequestFilters, search: "SURG-TEST-456" })).toBe(true);
    expect(matchesRequest(record, { ...emptyRequestFilters, search: "REQ-TEST-01" })).toBe(true);
    for (const scope of ["hn", "an", "accession", "surgical"]) {
      expect(matchesRequest(record, { ...emptyRequestFilters, scope, search: "REQ-TEST-01" })).toBe(false);
    }
    expect(matchesRequest(record, { ...emptyRequestFilters, scope: "accession", search: "SURG-TEST-456" })).toBe(false);
    expect(matchesRequest(record, { ...emptyRequestFilters, scope: "surgical", search: "P-2026-123" })).toBe(false);
    expect(matchesRequest(record, { ...emptyRequestFilters, scope: "hn", search: "SURG-TEST-456" })).toBe(false);
    expect(matchesRequest({ ...record, pathology: { accessionNumber: "P-2026-123" } }, { ...emptyRequestFilters, scope: "surgical", search: "P-2026-123" })).toBe(false);
  });
});
