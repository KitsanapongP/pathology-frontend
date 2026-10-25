// Temporary, dependency-free Thai STT adapter. Replace this boundary when the real API exists.
type BrowserResult = { isFinal: boolean; 0: { transcript: string } };
type BrowserRecognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<BrowserResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition };
export type SpeechSession = { start: () => void; stop: () => void; abort: () => void };
export type SpeechCallbacks = { transcript: (final: string, interim: string) => void; error: (code: string) => void; end: () => void; captureStart?: () => void; captureEnd?: () => void };
export const speechPreview = { name: "Web Speech API", language: "th-TH" };

export function supportsSpeechPreview() {
  if (typeof window === "undefined") return false;
  const browser = window as SpeechWindow;
  return Boolean(browser.SpeechRecognition ?? browser.webkitSpeechRecognition);
}

export function createSpeechPreview(callbacks: SpeechCallbacks): SpeechSession | null {
  if (typeof window === "undefined") return null;
  const browser = window as SpeechWindow;
  const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  if (!Constructor) return null;
  const recognition = new Constructor();
  recognition.lang = speechPreview.language; recognition.continuous = true; recognition.interimResults = true;
  let final = "";
  recognition.onresult = event => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index++) {
      const result = event.results[index];
      if (result.isFinal) final += `${result[0].transcript} `;
      else interim += result[0].transcript;
    }
    callbacks.transcript(final, interim);
  };
  recognition.onerror = event => callbacks.error(event.error);
  recognition.onend = callbacks.end;
  recognition.onaudiostart = () => callbacks.captureStart?.();
  recognition.onaudioend = () => callbacks.captureEnd?.();
  return { start: () => recognition.start(), stop: () => recognition.stop(), abort: () => recognition.abort() };
}

export function speechPreviewError(code: string) {
  if (code === "not-allowed") return "ยังไม่ได้รับสิทธิ์ไมค์ เปิดสิทธิ์ไมโครโฟนของหน้านี้แล้วลองใหม่";
  if (code === "service-not-allowed") return "บริการถอดเสียงของเบราว์เซอร์นี้ใช้ไม่ได้ ลองเปิดหน้านี้ใน Chrome หรือพิมพ์แทน";
  if (code === "network") return "เชื่อมต่อบริการถอดเสียงไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  if (code === "audio-capture") return "ไม่พบไมโครโฟน ตรวจการเชื่อมต่อและเลือกไมค์ในเบราว์เซอร์แล้วลองใหม่";
  if (code === "language-not-supported") return "บริการนี้ยังไม่รองรับภาษาไทย ลองใช้ Chrome หรือพิมพ์แทน";
  if (code === "no-speech") return "ยังไม่ได้ยินเสียง ลองกดค้างแล้วพูดใหม่";
  return "รับเสียงพูดไม่สำเร็จ ลองพูดใหม่ หรือพิมพ์แทน";
}
