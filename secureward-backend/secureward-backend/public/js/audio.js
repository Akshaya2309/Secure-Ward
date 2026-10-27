// ============================================================================
// SECUREWARD - WEB AUDIO API TACTICAL SFX ENGINE
// Pure synthesized sound effects without external audio asset dependencies
// ============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.lockdownOsc = null;
    this.lockdownGain = null;
    this.isLockdownSoundPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isLockdownSoundPlaying) {
      this.stopLockdownSiren();
    }
    return this.isMuted;
  }

  playClick() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playBeep(freq = 1200, duration = 0.08) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playAccessGranted() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.04, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.1);
      });
    } catch (e) {}
  }

  playAccessDenied() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [220, 180].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.07, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.12);
      });
    } catch (e) {}
  }

  startLockdownSiren() {
    if (this.isMuted || this.isLockdownSoundPlaying) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.isLockdownSoundPlaying = true;
      
      const now = this.ctx.currentTime;
      this.lockdownOsc = this.ctx.createOscillator();
      this.lockdownGain = this.ctx.createGain();
      
      this.lockdownOsc.type = 'sawtooth';
      
      // Siren wail: modulates between 350Hz and 750Hz
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'triangle';
      lfo.frequency.setValueAtTime(0.65, now); // ~1.5 sec cycle
      lfoGain.gain.setValueAtTime(200, now);
      
      this.lockdownOsc.frequency.setValueAtTime(550, now);
      lfo.connect(this.lockdownOsc.frequency);
      
      this.lockdownGain.gain.setValueAtTime(0.08, now);
      
      this.lockdownOsc.connect(this.lockdownGain);
      this.lockdownGain.connect(this.ctx.destination);
      
      this.lockdownOsc.start();
      lfo.start();
      this._lfo = lfo;
    } catch (e) {
      console.warn('Lockdown audio error:', e);
    }
  }

  stopLockdownSiren() {
    try {
      if (this.lockdownOsc) {
        this.lockdownOsc.stop();
        this.lockdownOsc.disconnect();
        this.lockdownOsc = null;
      }
      if (this._lfo) {
        this._lfo.stop();
        this._lfo.disconnect();
        this._lfo = null;
      }
      if (this.lockdownGain) {
        this.lockdownGain.disconnect();
        this.lockdownGain = null;
      }
      this.isLockdownSoundPlaying = false;
    } catch (e) {}
  }
}

window.soundEngine = new SoundEngine();
