import { invoke } from "@tauri-apps/api/core";

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

/** 发起连接：轻柔触感音 (Tink) */
export function playConnectingSound() {
  if (!soundEnabled) return;
  invoke('play_system_sound', { name: 'Tink' }).catch(() => {
    playTone(400, 'sine', 0.15, 0.08, 0.02);
    setTimeout(() => playTone(600, 'sine', 0.2, 0.08, 0.02), 100);
  });
}

/** 连接成功：清爽气泡上扬音 (Pop) */
export function playConnectedSound() {
  if (!soundEnabled) return;
  invoke('play_system_sound', { name: 'Pop' }).catch(() => {
    playTone(523.25, 'sine', 0.35, 0.1, 0.03); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.35, 0.1, 0.03), 80); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.5, 0.12, 0.03), 160); // G5
  });
}

/** 主动断开：清脆开盖/拔出自然音 (Bottle)，避免以前误用 Basso 的报错感 */
export function playDisconnectedSound() {
  if (!soundEnabled) return;
  invoke('play_system_sound', { name: 'Bottle' }).catch(() => {
    playTone(493.88, 'sine', 0.2, 0.08, 0.03); // B4
    setTimeout(() => playTone(329.63, 'sine', 0.25, 0.08, 0.03), 90); // E4
  });
}

/** 连接失败/发生错误：浑厚低沉警示音 (Basso) */
export function playConnectFailedSound() {
  if (!soundEnabled) return;
  invoke('play_system_sound', { name: 'Basso' }).catch(() => {
    playTone(311.13, 'triangle', 0.35, 0.12, 0.05); // Eb4
    setTimeout(() => playTone(261.63, 'triangle', 0.45, 0.15, 0.05), 180); // C4
  });
}

/** 端口冲突/严重警告：系统告警双拍音 (Sosumi) */
export function playConflictSound() {
  if (!soundEnabled) return;
  invoke('play_system_sound', { name: 'Sosumi' }).catch(() => {
    playTone(261.63, 'sawtooth', 0.15, 0.15, 0.02);
    setTimeout(() => playTone(220.00, 'sawtooth', 0.25, 0.18, 0.02), 120);
  });
}

/** 意外断开/后台自动重连中：声呐探测提醒音 (Ping) */
export function playReconnectingSound() {
  if (!soundEnabled) return;
  invoke('play_system_sound', { name: 'Ping' }).catch(() => {
    playTone(440, 'sine', 0.18, 0.08, 0.02); // A4
    setTimeout(() => playTone(554.37, 'sine', 0.22, 0.08, 0.02), 100); // C#5
  });
}

// Backwards compatibility aliases
export const playConnectSound = playConnectedSound;
export const playDisconnectSound = playDisconnectedSound;
