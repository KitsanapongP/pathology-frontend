import type { RequestRecord } from './request-data';

export type RequestFilters = {
  search: string; scope: string; ward: string; test: string; ocr: string; review: string;
  from: string; to: string; doctor: string; sex: string;
};
export const emptyRequestFilters: RequestFilters = { search: '', scope: 'all', ward: '', test: '', ocr: '', review: '', from: '', to: '', doctor: '', sex: '' };
export function receivedDate(record: RequestRecord) { return record.receivedAt ?? record.uploadedAt; }
export function bangkokDay(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function matchesRequest(record: RequestRecord, filters: RequestFilters) {
  const field = record.pathology;
  if (filters.from && filters.to && filters.from > filters.to) return false;
  if ((filters.ward && field?.ward !== filters.ward) || (filters.test && !field?.tests?.includes(filters.test)) ||
      (filters.ocr && record.ocr !== filters.ocr) || (filters.review && record.review !== filters.review) ||
      (filters.doctor && field?.requestingDoctor !== filters.doctor) || (filters.sex && field?.sex !== filters.sex)) return false;
  const day = bangkokDay(receivedDate(record));
  if ((filters.from || filters.to) && !day) return false;
  if ((filters.from && day < filters.from) || (filters.to && day > filters.to)) return false;
  const identifiers = [record.id, record.hn, field?.an, field?.accessionNumber].filter(Boolean).join(' ');
  const fields: Record<string, string> = {
    hn: record.hn, an: field?.an ?? '', patient: record.patientName,
    accession: `${record.id} ${field?.accessionNumber ?? ''}`,
    all: [identifiers, record.patientName, record.sender, record.fileName, field?.ward, field?.hospital,
      field?.requestingDoctor, field?.collector, field?.specimen, field?.clinicalDiagnosis, ...(field?.tests ?? [])].filter(Boolean).join(' '),
  };
  const value = (fields[filters.scope] ?? fields.all).normalize('NFKC').toLocaleLowerCase();
  const tokens = filters.search.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const identifierScope = ['hn', 'an', 'accession'].includes(filters.scope);
  return tokens.every(token => {
    const identifierToken = token.replace(/[^a-z0-9ก-๙]/g, '');
    return value.includes(token) || (identifierScope && Boolean(identifierToken) && value.replace(/[^a-z0-9ก-๙]/g, '').includes(identifierToken));
  });
}
