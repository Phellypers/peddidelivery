export const NOTIFICATION_SOUNDS = {
  newOrder: 'Novo-pedido-peddi-notification.mp3',
  newTicket: 'Novo-chamado-peddi.mp3',
  message: 'notificação-mensagem-recebida-peddi.mp3',
  ready: 'Pedido-pronto-cliente.mp3',
  accepted: 'Entregador-aceitou-pedido-peddi.mp3',
  refused: 'Entregador-rejeitou-pedido-peddi.mp3',
  general: 'Notificação-push-app.mp3',
};
export const soundUrl = kind => `/Sounds-peddi/${encodeURIComponent(NOTIFICATION_SOUNDS[kind] || NOTIFICATION_SOUNDS.general)}`;

export function createNotificationSoundPlayer(AudioClass) {
  const audio = new AudioClass(soundUrl('general'));
  audio.preload = 'auto';
  const seen = new Map();
  const queue = [];
  let unlocked = false;
  let unlocking = false;
  let playing = false;
  const next = () => {
    if (playing || !queue.length || !unlocked) return;
    playing = true;
    audio.src = soundUrl(queue.shift());
    audio.volume = 0.8;
    audio.currentTime = 0;
    Promise.resolve(audio.play()).catch(() => { playing = false; queue.length = 0; unlocked = false; });
  };
  const finish = () => { playing = false; next(); };
  audio.onended = finish;
  audio.onerror = finish;
  return {
    async unlock() {
      if (unlocked || unlocking) return;
      unlocking = true;
      audio.volume = 0;
      try {
        await audio.play();
        audio.pause(); audio.currentTime = 0; audio.volume = 0.8;
        unlocked = true;
      } catch { /* Retry on the next user gesture; never disturb notifications. */ }
      finally { unlocking = false; }
    },
    play(kind, eventKey) {
      if (!unlocked || !NOTIFICATION_SOUNDS[kind]) return false;
      const now = Date.now();
      for (const [key, time] of seen) if (now - time > 60000) seen.delete(key);
      const key = `${kind}:${eventKey}`;
      if (seen.has(key)) return false;
      seen.set(key, now);
      if (queue.length < 5) queue.push(kind);
      next(); return true;
    },
    reset() { audio.pause(); audio.currentTime = 0; queue.length = 0; seen.clear(); playing = false; },
  };
}
let player;
const getPlayer = () => player ||= createNotificationSoundPlayer(window.Audio);
export const playNotificationSound = (kind, eventKey) => getPlayer().play(kind, eventKey);
export const resetNotificationSounds = () => player?.reset();
export function installSoundUnlock() {
  const unlock = () => { void getPlayer().unlock(); };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
}
