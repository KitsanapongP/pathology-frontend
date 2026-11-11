import { expect, it } from "vitest";
import { microphoneLevels, microphoneWaveform, smoothWaveform, waveformPath } from "@/lib/examination-audio-level";

it("keeps silence flat and shows only measured input energy", () => {
  expect(microphoneLevels(new Uint8Array(120).fill(128))).toEqual(Array(12).fill(0));
  const samples = new Uint8Array(120).fill(128);
  samples.fill(160, 0, 10);
  expect(microphoneLevels(samples)).toEqual([1, ...Array(11).fill(0)]);
  expect(microphoneLevels(new Uint8Array(120).fill(255))).toEqual(Array(12).fill(1));
  expect(microphoneLevels(new Uint8Array())).toEqual(Array(12).fill(0));
});

it("preserves a signed waveform with bounded peaks and a flat silent line", () => {
  const silence = microphoneWaveform(new Uint8Array(2048).fill(128));
  expect(silence).toEqual(Array(160).fill(0));
  expect(microphoneWaveform(new Uint8Array(2048).fill(192))).toEqual(Array(160).fill(1));
  expect(microphoneWaveform(new Uint8Array(2048).fill(0))).toEqual(Array(160).fill(-1));
  const wave = new Uint8Array(2048).map((_, i) => 128 + Math.round(40 * Math.sin(i / 20)));
  const values = microphoneWaveform(wave);
  expect(Math.min(...values)).toBeLessThan(-.5);
  expect(Math.max(...values)).toBeGreaterThan(.5);
  expect(waveformPath(silence)).toMatch(/^M0 32\.00 Q/);
  expect(waveformPath(silence)).toMatch(/L480 32\.00$/);
});

it("smooths changes by elapsed time and settles back to real silence", () => {
  const first = smoothWaveform([0, 0], [1, -1], 16);
  expect(first[0]).toBeGreaterThan(0);
  expect(first[0]).toBeLessThan(1);
  expect(first[1]).toBe(-first[0]);
  let values = first;
  for (let i = 0; i < 30; i++) values = smoothWaveform(values, [0, 0], 16);
  expect(values[0]).toBeCloseTo(0, 5);
  expect(smoothWaveform([0, 0], [1, -1], 32)[0]).toBeCloseTo(smoothWaveform(first, [1, -1], 16)[0]);
});
