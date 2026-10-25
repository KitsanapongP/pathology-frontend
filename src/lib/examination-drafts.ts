import type { ExaminationPart } from "./examination-data";

export type ExaminationClip = { id: string; partId: string; seconds: number; blob: Blob };
export type ExaminationDraft = { version: 2; requestId: string; parts: ExaminationPart[]; clips: ExaminationClip[]; confirmed: boolean; savedAt: string };

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pathology-examination-station", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts", { keyPath: "requestId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readExaminationDraft(id: string): Promise<ExaminationDraft | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readonly");
    const request = tx.objectStore("drafts").get(id);
    tx.oncomplete = () => { db.close(); resolve(request.result ?? null); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function writeExaminationDraft(draft: ExaminationDraft) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").put(draft);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
