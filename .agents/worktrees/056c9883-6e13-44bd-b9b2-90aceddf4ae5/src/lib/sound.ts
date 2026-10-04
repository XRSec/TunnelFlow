let soundEnabled = true;

try {
  const stored = localStorage.getItem("tunnelflow:sound_enabled");
  if (stored !== null) {
    soundEnabled = stored === "true";
  }
} catch (e) {
  // Ignore
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  try {
    localStorage.setItem("tunnelflow:sound_enabled", enabled ? "true" : "false");
  } catch (e) {
    // Ignore
  }
}

let audioCtx: AudioContext | null = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, type: OscillatorType, duration: number, vol: number, attack: number = 0.05) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // ADSR Envelope to prevent clicks/pops
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (err) {}
    };
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.debug("Audio play error", e);
  }
}

export function playConnectingSound() {
  if (!soundEnabled) return;
  playTone(400, 'sine', 0.2, 0.1, 0.02);
  setTimeout(() => playTone(600, 'sine', 0.3, 0.08, 0.02), 150);
}

import { invoke } from "@tauri-apps/api/core";

export function playConnectedSound() {
  if (!soundEnabled) return;
  invoke('play_system_sound', { name: 'Pop' }).catch(() => {
    playTone(523.25, 'sine', 0.4, 0.1, 0.05); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.4, 0.1, 0.05), 100); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.6, 0.15, 0.05), 200); // G5
  });
}

export function playConnectFailedSound() {
  if (!soundEnabled) return;
  invoke('play_system_sound', { name: 'Basso' }).catch(() => {
    playTone(311.13, 'triangle', 0.4, 0.1, 0.05); // Eb4
    setTimeout(() => playTone(261.63, 'triangle', 0.5, 0.15, 0.05), 200); // C4
  });
}

export function playDisconnectedSound() {
  if (!soundEnabled) return;
  invoke('play_system_sound', { name: 'Basso' }).catch(() => {
    playTone(392.00, 'sine', 0.3, 0.1, 0.05); // G4
    setTimeout(() => playTone(293.66, 'sine', 0.4, 0.1, 0.05), 150); // D4
  });
}

export function playConflictSound() {
  if (!soundEnabled) return;
  playTone(200, 'sawtooth', 0.2, 0.2, 0.02);
  setTimeout(() => playTone(150, 'sawtooth', 0.3, 0.2, 0.02), 150);
}

// Backwards compatibility aliases
export const playConnectSound = playConnectedSound;
export const playDisconnectSound = playDisconnectedSound;
