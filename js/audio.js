/* Klang: kleine WebAudio-Synth-Effekte und eine kurze Chiptune-Schleife. Keine Audiodateien. */
'use strict';

(function () {
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  const MELODY = [72, 0, 76, 79, 77, 76, 74, 0, 72, 74, 76, 72, 71, 0, 67, 0,
    72, 0, 76, 79, 81, 79, 77, 76, 74, 72, 74, 76, 72, 0, 0, 0];
  const BASS = [48, 43, 45, 40, 41, 36, 43, 43, 48, 43, 45, 40, 41, 43, 48, 48];

  const Audio = {
    ctx: null, master: null, sfxBus: null, musicBus: null,
    muted: ALO.store.get('muted', false),
    musicOn: false, tempo: 132, step: 0, nextTime: 0, timer: null,

    init() {
      if (this.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.6;
        this.master.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.8; this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.32; this.musicBus.connect(this.master);
      } catch (e) {
        this.ctx = null;
      }
    },

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },

    setMuted(m) {
      this.muted = m;
      ALO.store.set('muted', m);
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.02);
    },

    tone(freq, dur, type, vol, slideTo, delay, bus) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + (delay || 0);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(bus || this.sfxBus);
      o.start(t0); o.stop(t0 + dur + 0.02);
    },

    noise(dur, vol, freq, type, delay) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + (delay || 0);
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq || 2000;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.15, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(this.sfxBus);
      src.start(t0); src.stop(t0 + dur + 0.02);
    },

    arp(notes, step, type, vol) {
      notes.forEach((n, i) => this.tone(midi(n), step * 1.6, type || 'triangle', vol || 0.12, null, i * step));
    },

    play(name) {
      if (!this.ctx || this.muted) return;
      switch (name) {
        case 'jump': this.tone(380, 0.13, 'square', 0.07, 640); break;
        case 'land': this.tone(140, 0.07, 'triangle', 0.1, 70); break;
        case 'ping': this.tone(900, 0.07, 'triangle', 0.12, 1400); this.tone(1400, 0.06, 'square', 0.04, null, 0.05); break;
        case 'bit': this.tone(988, 0.06, 'square', 0.06); this.tone(1319, 0.1, 'square', 0.06, null, 0.05); break;
        case 'crack': this.noise(0.07, 0.2, 3000); this.tone(1800, 0.05, 'triangle', 0.05, 900); break;
        case 'shatter': this.noise(0.25, 0.22, 1800); this.tone(1500, 0.2, 'triangle', 0.06, 500); break;
        case 'freeze': this.tone(1200, 0.4, 'sine', 0.1, 2600); this.tone(1800, 0.35, 'triangle', 0.05, 3200, 0.05); break;
        case 'frost': this.tone(900, 0.16, 'triangle', 0.1, 380); this.noise(0.1, 0.08, 4000); break;
        case 'hurt': this.tone(320, 0.26, 'sawtooth', 0.09, 110); break;
        case 'pop': this.tone(620, 0.1, 'square', 0.07, 180); this.noise(0.06, 0.08, 2500); break;
        case 'stomp': this.tone(240, 0.09, 'square', 0.08, 480); break;
        case 'thud': this.tone(95, 0.35, 'sine', 0.3, 40); this.noise(0.2, 0.15, 400, 'lowpass'); break;
        case 'boing': this.tone(200, 0.28, 'sine', 0.15, 760); break;
        case 'free': this.arp([72, 76, 79, 84], 0.07, 'square', 0.06); break;
        case 'wakelock': this.arp([69, 73, 76, 81, 85], 0.06, 'triangle', 0.12); break;
        case 'checkpoint': this.arp([76, 83], 0.09, 'triangle', 0.12); break;
        case 'throw': this.tone(700, 0.12, 'sine', 0.06, 300); break;
        case 'wave': this.noise(0.3, 0.1, 800, 'lowpass'); break;
        case 'deny': this.tone(200, 0.06, 'square', 0.06); this.tone(170, 0.08, 'square', 0.06, null, 0.08); break;
        case 'bossHit': this.tone(420, 0.35, 'sawtooth', 0.1, 90); this.noise(0.3, 0.2, 1200); break;
        case 'warn': this.tone(1400, 0.05, 'square', 0.03); break;
        case 'talk': for (let i = 0; i < 6; i++) this.tone(300 + Math.random() * 420, 0.045, 'square', 0.035, null, i * 0.07); break;
        case 'laugh': for (let i = 0; i < 5; i++) this.tone(700 + (i % 2) * 180 + Math.random() * 60, 0.07, 'triangle', 0.06, null, i * 0.11); break;
        case 'victory': this.arp([72, 76, 79, 84, 79, 84, 88], 0.11, 'square', 0.07); break;
        case 'gameover': this.arp([72, 70, 67, 63, 60], 0.18, 'triangle', 0.13); break;
      }
    },

    /* ---- Musik ---- */
    startMusic(tempo) {
      if (!this.ctx) return;
      this.tempo = tempo || 132;
      if (this.musicOn) return;
      this.musicOn = true;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 60);
    },

    stopMusic() {
      this.musicOn = false;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    },

    schedule() {
      if (!this.ctx || !this.musicOn) return;
      const eighth = 60 / this.tempo / 2;
      while (this.nextTime < this.ctx.currentTime + 0.25) {
        const delay = Math.max(0, this.nextTime - this.ctx.currentTime);
        if (!this.muted) {
          const m = MELODY[this.step % MELODY.length];
          if (m) this.tone(midi(m), eighth * 0.9, 'square', 0.05, null, delay, this.musicBus);
          if (this.step % 2 === 0) {
            const b = BASS[(this.step / 2) % BASS.length];
            this.tone(midi(b), eighth * 1.7, 'triangle', 0.14, null, delay, this.musicBus);
          }
        }
        this.step++;
        this.nextTime += eighth;
      }
    },
  };

  ALO.Audio = Audio;
})();
