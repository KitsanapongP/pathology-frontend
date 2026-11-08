import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useExaminationVoice } from "@/hooks/use-examination-voice";

vi.mock("@/lib/examination-speech-preview", () => ({ createSpeechPreview: () => null, supportsSpeechPreview: () => false, speechPreviewError: () => "error" }));

afterEach(() => vi.unstubAllGlobals());

function setup(permission?: Promise<MediaStream>) {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  const recorders: FakeRecorder[] = [];
  class FakeRecorder {
    static isTypeSupported() { return true; }
    state = "inactive";
    mimeType = "audio/webm";
    onstart = () => {};
    onstop = () => {};
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.onstop(); }
    constructor() { recorders.push(this); }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => permission ?? Promise.resolve(stream) } });
  const callbacks = { command: vi.fn(), dictation: vi.fn(), search: vi.fn(), field: vi.fn(), clip: vi.fn(), notice: vi.fn() };
  return { stream, stop, recorders, callbacks };
}

it("reports recording only after MediaRecorder starts and clears on release", async () => {
  const rig = setup();
  const hook = renderHook(() => useExaminationVoice(rig.callbacks, "record"));
  await act(async () => { await hook.result.current.start("dictation", "A"); });
  expect(hook.result.current.capturing).toBe(false);
  expect(hook.result.current.mode).toBe("starting");
  act(() => rig.recorders[0].onstart());
  expect(hook.result.current.capturing).toBe(true);
  expect(hook.result.current.inputStream).toBe(rig.stream);
  act(() => hook.result.current.stop());
  expect(hook.result.current.capturing).toBe(false);
  expect(hook.result.current.inputStream).toBeNull();
  expect(rig.stop).toHaveBeenCalled();
  hook.unmount();
});

it("cannot start recording after release while permission is pending", async () => {
  let resolve!: (stream: MediaStream) => void;
  const rig = setup(new Promise<MediaStream>(done => { resolve = done; }));
  const hook = renderHook(() => useExaminationVoice(rig.callbacks, "record"));
  let pending!: Promise<void>;
  act(() => { pending = hook.result.current.start("dictation"); });
  act(() => hook.result.current.stop());
  await act(async () => { resolve(rig.stream); await pending; });
  expect(rig.recorders).toHaveLength(0);
  expect(rig.stop).toHaveBeenCalled();
  expect(hook.result.current.capturing).toBe(false);
  hook.unmount();
});
