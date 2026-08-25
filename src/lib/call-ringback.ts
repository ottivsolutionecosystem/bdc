"use client";

let audioContext: AudioContext | null = null;
let cycleTimer: number | null = null;
let secondBeepTimer: number | null = null;

function playBeep(durationMs: number) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 425;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  const now = audioContext.currentTime;
  const duration = durationMs / 1000;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
  gain.gain.setValueAtTime(0.14, now + Math.max(0.03, duration - 0.04));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playDoublePulse() {
  if (secondBeepTimer !== null) {
    window.clearTimeout(secondBeepTimer);
    secondBeepTimer = null;
  }
  playBeep(380);
  secondBeepTimer = window.setTimeout(() => playBeep(380), 560);
}

export async function startCallRingback() {
  stopCallRingback();
  const context = new AudioContext();
  audioContext = context;
  try {
    await context.resume();
  } catch {
    stopCallRingback();
    return;
  }
  if (audioContext !== context) {
    void context.close();
    return;
  }
  playDoublePulse();
  cycleTimer = window.setInterval(playDoublePulse, 3200);
}

export function stopCallRingback() {
  if (cycleTimer !== null) {
    window.clearInterval(cycleTimer);
    cycleTimer = null;
  }
  if (secondBeepTimer !== null) {
    window.clearTimeout(secondBeepTimer);
    secondBeepTimer = null;
  }
  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
}
