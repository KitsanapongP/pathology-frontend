import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const testDirectory = path.dirname(fileURLToPath(import.meta.url));

// Compile the real controller/provider using the project's installed TypeScript.
// No browser, microphone, model download, or external speech service is used.
const cache = new Map();
function load(name) {
  const file = path.resolve(testDirectory, "../src/lib", name);
  if (cache.has(file)) return cache.get(file);
  const compiled = { exports: {} };
  cache.set(file, compiled.exports);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function("require", "module", "exports", code)(request => {
    if (!request.startsWith(".")) throw new Error(`Unexpected dependency ${request}; extend the test loader explicitly.`);
    return load(`${request.replace(/^\.\//, "")}.ts`);
  }, compiled, compiled.exports);
  cache.set(file, compiled.exports);
  return compiled.exports;
}
const { createExaminationGestures } = load("examination-gestures.ts");
const { examinationPedalInstructions, examinationPedalMap, pedalForKey, normalizeSpokenDigits } = load("examination-controls.ts");
const speech = load("examination-speech-preview.ts");

function rig() {
  let time = 0, id = 0;
  const timers = new Map();
  const events = [];
  const controller = createExaminationGestures({ start: action => events.push(["start", action]), stop: (action, cancelled) => events.push(["stop", action, cancelled]), perform: action => events.push(["perform", action]), pressed: () => {} }, {
    now: () => time,
    later: (callback, ms) => { const next = ++id; timers.set(next, { callback, at: time + ms }); return next; },
    clear: timer => timers.delete(timer),
  });
  function advance(ms) { time += ms; for (const [key, timer] of timers) if (timer.at <= time) { timers.delete(key); timer.callback(); } }
  return { ...controller, events, advance };
}

test("center tap activates without ever opening the microphone in every context", () => {
  for (const context of Object.keys(examinationPedalMap)) {
    const r = rig(); r.press("center", context); r.advance(249); r.release("center"); r.advance(1000);
    assert.deepEqual(r.events, [["perform", "activate"]], context);
  }
});
test("center opens speech only after the hold threshold, and release stops it", () => {
  const r = rig(); r.press("center", "record"); r.advance(249); assert.deepEqual(r.events, []);
  r.advance(1); assert.deepEqual(r.events, [["start", "speak"]]); r.release("center");
  assert.deepEqual(r.events, [["start", "speak"], ["stop", "speak", false]]);
});
test("repeated keydown and simultaneous pedals do not start another capture", () => {
  const r = rig(); r.press("center", "record"); r.advance(250); r.press("center", "record"); r.press("left", "record"); r.release("center");
  assert.equal(r.events.filter(event => event[0] === "start").length, 1);
});
test("left double tap backs out of every screen and dialog without moving focus", () => {
  for (const context of Object.keys(examinationPedalMap)) {
    const r = rig(); r.press("left", context); r.release("left"); r.advance(100); r.press("left", context); r.release("left"); r.advance(1000);
    assert.deepEqual(r.events, [["perform", "back"]], context);
  }
});
test("right double tap toggles help in every context including help and confirmation", () => {
  for (const context of Object.keys(examinationPedalMap)) {
    const r = rig(); r.press("right", context); r.release("right"); r.advance(100); r.press("right", context); r.release("right"); r.advance(1000);
    assert.deepEqual(r.events, [["perform", "help"]], context);
  }
});
test("single side taps navigate only after the double-tap window", () => {
  const r = rig(); r.press("right", "record"); r.release("right"); r.advance(349); assert.deepEqual(r.events, []); r.advance(1);
  r.press("left", "record"); r.release("left"); r.advance(350);
  assert.deepEqual(r.events, [["perform", "nextControl"], ["perform", "previousControl"]]);
});
test("finalization requires the actual confirmation target and a full new hold", () => {
  const r = rig(); r.press("center", "confirm", true, true); r.advance(1499); r.release("center"); assert.deepEqual(r.events, []);
  r.press("center", "confirm", true, true); r.advance(1500); assert.deepEqual(r.events, []); r.release("center");
  assert.deepEqual(r.events, [["perform", "confirm"]]);
  const cancel = rig(); cancel.press("center", "confirm", true, false); cancel.advance(1500); cancel.release("center");
  assert.deepEqual(cancel.events, [["start", "speak"], ["stop", "speak", false]]);
});
test("cancel before threshold prevents mic start, while cancel during speech stops it", () => {
  const r = rig(); r.press("center", "standby"); r.advance(249); r.cancel(); r.advance(2000); assert.deepEqual(r.events, []);
  r.press("center", "record"); r.advance(250); r.cancel(); r.release("center");
  assert.deepEqual(r.events, [["start", "speak"], ["stop", "speak", true]]);
});
test("context cancellation cannot carry a tap or hold into the next screen", () => {
  const r = rig(); r.press("right", "record"); r.release("right"); r.cancel(); r.advance(1000);
  r.press("center", "case"); r.cancel(); r.advance(2000); r.release("center"); assert.deepEqual(r.events, []);
});
test("pressing another pedal cancels a pending side tap", () => {
  const r = rig(); r.press("right", "record"); r.release("right"); r.press("center", "record"); r.advance(250); r.release("center"); r.advance(1000);
  assert.deepEqual(r.events, [["start", "speak"], ["stop", "speak", false]]);
});
test("presses while processing are ignored rather than queued", () => {
  const r = rig(); r.press("right", "standby", false); r.release("right"); r.advance(1000);
  r.press("center", "record", false); r.release("center"); assert.deepEqual(r.events, []);
});
test("instructions show field-specific speech and confirmation only for its target", () => {
  assert.match(examinationPedalInstructions("standby", "")[1].steps[1].result, /เลขคำร้อง/);
  assert.match(examinationPedalInstructions("case", "")[1].steps[1].result, /เลขคำร้อง/);
  assert.match(examinationPedalInstructions("review", "", { voiceLabel: "แก้บรรทัดที่เลือก" })[1].steps[1].result, /แก้บรรทัด/);
  assert.doesNotMatch(examinationPedalInstructions("confirm", "")[1].steps[0].gesture, /1\.5/);
  assert.match(examinationPedalInstructions("confirm", "", { confirmFocused: true })[1].steps[0].gesture, /1\.5/);
});
test("hardware aliases, keyboard aliases and spoken Thai digits are supported", () => {
  for (const [key, pedal] of [["F13", "left"], ["F14", "center"], ["F15", "right"], ["F8", "left"], ["F9", "center"], ["F10", "right"]]) assert.equal(pedalForKey(key), pedal);
  assert.equal(pedalForKey("Enter"), undefined);
  assert.equal(normalizeSpokenDigits("ศูนย์ ศูนย์ สี่ หนึ่ง").replace(/\s/g, ""), "0041");
});
test("the displayed spoken request example opens one ready fixture", () => {
  const { examinationRequests, readyForRecording } = load("examination-data.ts");
  const query = normalizeSpokenDigits("ศูนย์ ศูนย์ สาม แปด").replace(/\s/g, "");
  const matches = examinationRequests().filter(request => request.id.includes(query));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "REQ-2569-0038");
  assert.equal(readyForRecording(matches[0]), true);
});

test("request status explains the same blockers that prevent recording", () => {
  const { examinationRequests, recordingBlockReason, readyForRecording } = load("examination-data.ts");
  const requests = examinationRequests();
  // Build a pending state explicitly: intake fixtures may already contain completed OCR.
  const pending = { ...requests.find(request => request.id.endsWith("0039")), ocr: "รอประมวลผล" };
  assert.equal(readyForRecording(pending), false);
  assert.match(recordingBlockReason(pending), /OCR.*ยืนยัน/);
  const ready = requests.find(request => request.id.endsWith("0038"));
  assert.equal(recordingBlockReason(ready), null);
  for (const [request, reason] of [
    [{ ...ready, review: "รอตรวจสอบ" }, /ยืนยัน/],
    [{ ...ready, review: "ต้องแก้ไข" }, /แก้ไข.*ยืนยัน/],
    [{ ...ready, ocr: "ไม่สามารถสแกนได้" }, /สแกน.*ไม่สำเร็จ/],
    [{ ...ready, accession: "" }, /เลขการตรวจ/],
  ]) {
    assert.equal(readyForRecording(request), false);
    assert.match(recordingBlockReason(request), reason);
  }
});
test("temporary STT is optional and reports unsupported browsers without a fake transcript", () => {
  const original = global.window;
  try { global.window = {}; assert.equal(speech.supportsSpeechPreview(), false); assert.equal(speech.createSpeechPreview({}), null); }
  finally { if (original === undefined) delete global.window; else global.window = original; }
});
test("temporary STT selects Thai and preserves final vs interim results", () => {
  const original = global.window;
  const instances = [];
  class Recognition { constructor() { instances.push(this); } start() {} stop() {} abort() {} }
  const texts = [];
  try {
    global.window = { webkitSpeechRecognition: Recognition };
    speech.createSpeechPreview({ transcript: (final, interim) => texts.push([final, interim]), error: () => {}, end: () => {} });
    const instance = instances[0];
    assert.equal(instance.lang, "th-TH");
    instance.onresult({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "ศูนย์ศูนย์" } }] });
    instance.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "0041" } }] });
    assert.deepEqual(texts, [["", "ศูนย์ศูนย์"], ["0041 ", ""]]);
    assert.match(speech.speechPreviewError("service-not-allowed"), /Chrome/);
  } finally { if (original === undefined) delete global.window; else global.window = original; }
});

test("temporary STT reports actual audio capture separately from requesting recognition", () => {
  const original = global.window;
  const instances = [];
  const events = [];
  class Recognition { constructor() { instances.push(this); } start() { events.push("request"); } stop() {} abort() {} }
  try {
    global.window = { webkitSpeechRecognition: Recognition };
    const session = speech.createSpeechPreview({ transcript() {}, error() {}, end: () => events.push("end"), captureStart: () => events.push("capture"), captureEnd: () => events.push("stopped") });
    const instance = instances[0];
    session.start();
    assert.deepEqual(events, ["request"]);
    instance.onaudiostart();
    instance.onaudioend();
    instance.onend();
    assert.deepEqual(events, ["request", "capture", "stopped", "end"]);
  } finally { if (original === undefined) delete global.window; else global.window = original; }
});

// Load the hook's pure selection and range helpers without a browser.
const focusModule = { exports: {} };
const focusCode = ts.transpileModule(fs.readFileSync(path.resolve(testDirectory, "../src/hooks/use-examination-focus.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function("require", "module", "exports", focusCode)(request => {
  if (request === "react") return {};
  throw new Error(`Unexpected dependency ${request}; extend the test loader explicitly.`);
}, focusModule, focusModule.exports);
const { restorePedalTarget, pedalRangeValue } = focusModule.exports;

test("restoration uses a replacement action and ignores unavailable targets", () => {
  const saved = { element: {}, actionId: "parts", label: "Part" };
  const replacement = { element: {}, actionId: "parts", label: "Part" };
  assert.equal(restorePedalTarget([replacement], saved), replacement);
  assert.equal(restorePedalTarget([], saved), undefined);
  const dialogTarget = { element: {}, label: "playback" };
  assert.equal(restorePedalTarget([dialogTarget], { element: {}, label: "playback" }), dialogTarget);
});

test("foot range increment uses the pedal step and clamps at bounds", () => {
  assert.equal(pedalRangeValue(3.2, 0, 12, 0.1, 5, 1), 8.2);
  assert.equal(pedalRangeValue(10, 0, 12, 0.1, 5, 1), 12);
  assert.equal(pedalRangeValue(2, 0, 12, 0.1, 5, -1), 0);
  assert.equal(pedalRangeValue(2, 0, 12, 0.1, 0, 1), 2.1);
});
