// The game's sounds, made rather than loaded

// A burst of white noise, `length` seconds long
function noise(audio: AudioContext, length: number) {
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * length), audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  return source;
}

// The jump: a short breath of noise swept down through a band, like paper
// flicked, and a soft low tap under it
export function flick(audio: AudioContext) {
  const now = audio.currentTime;
  const length = 0.14;
  const source = noise(audio, length);
  const band = audio.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.1;
  band.frequency.setValueAtTime(2200, now);
  band.frequency.exponentialRampToValueAtTime(800, now + length);
  const swish = audio.createGain();
  swish.gain.setValueAtTime(0, now);
  swish.gain.linearRampToValueAtTime(0.16, now + 0.008);
  swish.gain.exponentialRampToValueAtTime(0.001, now + length);
  source.connect(band).connect(swish).connect(audio.destination);
  source.start(now);

  const tap = audio.createOscillator();
  tap.frequency.setValueAtTime(320, now);
  tap.frequency.exponentialRampToValueAtTime(180, now + 0.07);
  const thump = audio.createGain();
  thump.gain.setValueAtTime(0.07, now);
  thump.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  tap.connect(thump).connect(audio.destination);
  tap.start(now);
  tap.stop(now + 0.09);
}

// The cut: the blades meeting, a bright metal click with a short ring, and
// the paper tearing just after
export function snip(audio: AudioContext) {
  const now = audio.currentTime;
  const click = noise(audio, 0.04);
  const high = audio.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 3500;
  const clickGain = audio.createGain();
  clickGain.gain.setValueAtTime(0.22, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  click.connect(high).connect(clickGain).connect(audio.destination);
  click.start(now);

  for (const frequency of [2350, 3170]) {
    const ring = audio.createOscillator();
    ring.type = "triangle";
    ring.frequency.value = frequency;
    const ringGain = audio.createGain();
    ringGain.gain.setValueAtTime(0.035, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    ring.connect(ringGain).connect(audio.destination);
    ring.start(now);
    ring.stop(now + 0.13);
  }

  const tear = noise(audio, 0.18);
  const band = audio.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.9;
  band.frequency.setValueAtTime(1600, now + 0.03);
  band.frequency.exponentialRampToValueAtTime(600, now + 0.21);
  const tearGain = audio.createGain();
  tearGain.gain.setValueAtTime(0, now);
  tearGain.gain.linearRampToValueAtTime(0.12, now + 0.05);
  tearGain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
  tear.connect(band).connect(tearGain).connect(audio.destination);
  tear.start(now + 0.03);
}
