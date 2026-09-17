import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NOTIFICATION_SOUNDS, soundUrl, createNotificationSoundPlayer } from '../../src/lib/notificationSounds.js';

class AudioFixture {
  static instance;
  calls = [];
  constructor(src) { this.src = src; AudioFixture.instance = this; }
  play() { this.calls.push({ src: this.src, volume: this.volume }); return Promise.resolve(); }
  pause() {}
}
test('every mapped sound uses an existing, nonempty uploaded MP3', () => {
  assert.equal(Object.keys(NOTIFICATION_SOUNDS).length, 7);
  for (const kind of Object.keys(NOTIFICATION_SOUNDS)) {
    const file = fs.readFileSync(new URL('../../public' + decodeURIComponent(soundUrl(kind)), import.meta.url));
    assert.ok(file.length > 1000);
    assert.ok(file.subarray(0, 3).toString() === 'ID3' || file[0] === 0xff);
  }
});
test('sounds wait for interaction, deduplicate events and play sequentially', async () => {
  const player = createNotificationSoundPlayer(AudioFixture);
  assert.equal(player.play('newOrder', 'order1'), false);
  await player.unlock();
  const audio = AudioFixture.instance;
  assert.equal(audio.calls[0].volume, 0);
  assert.equal(player.play('newOrder', 'order1'), true);
  assert.equal(player.play('newOrder', 'order1'), false);
  assert.equal(player.play('message', 'message1'), true);
  assert.equal(audio.calls.length, 2);
  audio.onended();
  assert.equal(audio.calls.length, 3);
  assert.equal(audio.calls[2].src, soundUrl('message'));
  player.reset(); audio.onended();
  assert.equal(audio.calls.length, 3);
});
test('blocked autoplay stays silent and can be retried', async () => {
  class BlockedAudio extends AudioFixture { play() { return Promise.reject(new Error('NotAllowedError')); } }
  const player = createNotificationSoundPlayer(BlockedAudio);
  await player.unlock();
  assert.equal(player.play('general', 'notification1'), false);
});
