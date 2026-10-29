import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Exercise the real hook with a minimal deterministic React/DOM harness.
function rig() {
  const slots = []; let cursor = 0; let effects = []; let frames = []; let observer;
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useCallback(fn) { cursor++; return fn; },
    useLayoutEffect(fn, deps) { const i = cursor++; const old = slots[i]; if (!old || deps.some((dep, n) => dep !== old.deps[n])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/hooks/use-examination-focus.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function("require", "module", "exports", code)(name => { if (name === "react") return react; throw Error(name); }, module, module.exports);
  class Element {
    constructor(id, adjust) { this.dataset = { actionId: id, ...(adjust ? { pedalAdjust: adjust } : {}) }; this.textContent = id; this.classList = { add() {}, remove() {}, contains() { return false; } }; }
    getAttribute(name) { return name === "aria-label" ? this.textContent : null; }
    hasAttribute() { return false; } matches() { return false; } closest() { return null; } getClientRects() { return [1]; }
    focus() {} scrollIntoView() {} click() { this.clicks = (this.clicks ?? 0) + 1; }
  }
  class Input extends Element {} class Select extends Element {} class Textarea extends Element {}
  Object.assign(globalThis, { Element, HTMLInputElement: Input, HTMLSelectElement: Select, HTMLTextAreaElement: Textarea,
    MutationObserver: class { constructor(callback) { observer = this; this.callback = callback; } observe(root, options) { this.options = options; } disconnect() {} }, requestAnimationFrame: cb => { frames.push(cb); return frames.length; }, cancelAnimationFrame() {} });
  const part = new Element("part", "part"), edit = new Element("edit"), help = new Element("help");
  function root(items, dialog = false) { return { tagName: dialog ? "DIALOG" : "DIV", querySelector: () => null, querySelectorAll: () => items, addEventListener() {}, removeEventListener() {}, contains: item => items.includes(item) }; }
  const rail = root([part, edit]), helpRoot = root([help], true), steps = [];
  let options = { context: "record", ready: true, root: () => rail, onPartAdjustmentStep: direction => steps.push(direction) };
  function render(next = options) { options = next; cursor = 0; effects = []; const hook = module.exports.useExaminationFocus(options); for (const effect of effects) effect(); const pending = frames; frames = []; pending.forEach(fn => fn()); return hook; }
  function mutate() { observer.callback(); const pending = frames; frames = []; pending.forEach(fn => fn()); }
  return { render, mutate, get observer() { return observer; }, part, edit, help, rail, helpRoot, steps, options };
}

test("Part pedal adjustment stays on its rail target and exits before navigation", () => {
  const r = rig(), focus = r.render();
  focus.activate(); assert.equal(focus.getTarget().adjusting, true);
  focus.move(1); focus.move(-1); assert.deepEqual(r.steps, [1, -1]);
  assert.equal(focus.getTarget().label, "part"); assert.equal(r.part.clicks, undefined);
  assert.equal(focus.leaveAdjustment(), true); assert.equal(focus.leaveAdjustment(), false);
  focus.move(1); assert.equal(focus.getTarget().label, "edit");
  focus.move(-1); focus.activate(); focus.activate(); assert.equal(focus.getTarget().adjusting, false);
});

test("help restores the Part target but ends its adjustment; stale controls cannot adjust", () => {
  const r = rig(); let focus = r.render(); focus.activate();
  focus = r.render({ ...r.options, context: "help", root: () => r.helpRoot });
  assert.equal(focus.getTarget().label, "help"); assert.equal(focus.getTarget().adjusting, false);
  focus = r.render({ ...r.options, context: "record", root: () => r.rail });
  assert.equal(focus.getTarget().label, "part"); assert.equal(focus.getTarget().adjusting, false);
  focus.activate(); r.rail.querySelectorAll = () => [r.edit]; focus.move(1);
  assert.deepEqual(r.steps, []); assert.equal(focus.getTarget().label, "edit");
});

test("Part label changes refresh the selected adjustment target", () => {
  const r = rig(); let focus = r.render(); focus.activate(); focus.move(1);
  assert.equal(r.observer.options.characterData, true);
  assert.ok(r.observer.options.attributeFilter.includes("aria-label"));
  r.part.textContent = "Part B"; r.mutate(); focus = r.render();
  assert.equal(focus.target.label, "Part B"); assert.equal(focus.target.adjusting, true);
});
