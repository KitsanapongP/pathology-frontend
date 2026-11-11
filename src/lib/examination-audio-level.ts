export function microphoneLevels(samples: Uint8Array, bars = 12): number[] {
  return Array.from({ length: bars }, (_, index) => {
    const start = Math.floor(index * samples.length / bars);
    const end = Math.floor((index + 1) * samples.length / bars);
    let energy = 0;
    for (let i = start; i < end; i += 1) energy += ((samples[i] - 128) / 128) ** 2;
    return end > start ? Math.min(1, Math.sqrt(energy / (end - start)) * 4) : 0;
  });
}

// Signed time-domain samples retain the actual wave shape, rather than energy bars.
export function microphoneWaveform(samples: Uint8Array, points = 160): number[] {
  return Array.from({ length: points }, (_, index) => {
    if (!samples.length) return 0;
    const at = Math.floor(index * (samples.length - 1) / Math.max(1, points - 1));
    const average = (samples[Math.max(0, at - 1)] + samples[at] + samples[Math.min(samples.length - 1, at + 1)]) / 3;
    return Math.max(-1, Math.min(1, (average - 128) / 64));
  });
}

export function smoothWaveform(previous: readonly number[], next: readonly number[], elapsedMs: number): number[] {
  const blend = 1 - Math.exp(-Math.max(0, elapsedMs) / 35);
  return next.map((value, index) => (previous[index] ?? 0) + (value - (previous[index] ?? 0)) * blend);
}

export function waveformPath(values: readonly number[]): string {
  if (values.length < 2) return "M0 32 H480";
  const points = values.map((value, index) => [index * 480 / (values.length - 1), 32 - value * 26]);
  let path = `M0 ${points[0][1].toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    const [x, y] = points[index];
    const [lastX, lastY] = points[index - 1];
    path += ` Q${lastX.toFixed(2)} ${lastY.toFixed(2)} ${((lastX + x) / 2).toFixed(2)} ${((lastY + y) / 2).toFixed(2)}`;
  }
  return `${path} L480 ${points.at(-1)![1].toFixed(2)}`;
}
