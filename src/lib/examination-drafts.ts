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

// Development fixtures can be reset without discarding the previous saved work.
export async function resetExaminationTestDraft(id: string, restore = false) {
  if (process.env.NODE_ENV !== "development") throw new Error("Case reset is available only in development.");
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    const drafts = tx.objectStore("drafts");
    const backupId = `__reset_backup__:${id}`;
    const request = drafts.get(restore ? backupId : id);
    request.onsuccess = () => {
      const draft = request.result as ExaminationDraft | undefined;
      if (restore) {
        if (!draft) { tx.abort(); return; }
        drafts.put({ ...draft, requestId: id });
      } else if (draft) {
        drafts.put({ ...draft, requestId: backupId });
        drafts.delete(id);
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error ?? new Error("No reset backup is available for this case.")); };
  });
}
