---
title: "Aither: Live Coding Audio Synthesis in JavaScript"
date: 2026-02-21
layout: "base.njk"
tags: post
order: 1
---

# Aither: Live Coding Audio Synthesis in JavaScript

Every sound in Aither is a function. A sine wave at 440 Hz:

```javascript
play('hello', s => Math.sin(2 * Math.PI * 440 * s.t) * 0.3)
```

That function runs 48,000 times per second. Each call returns a number
between -1 and 1 — one audio sample. The engine collects these samples
and sends them to the speakers. That's the entire model.

No graph. No scheduler. No distinction between "control rate" and
"audio rate." A signal is a function `f(s) => sample`. Everything
else — oscillators, filters, effects, composition — is functions
calling functions.

## How It Works

The state object `s` carries:

- `s.t` — elapsed time in seconds
- `s.sr` — sample rate (48000)
- `s.state` — 128-slot Float64Array for persistent memory
- `s.name` — signal identifier

Return a number for mono, `[left, right]` for stereo. The engine
soft-clips the final mix through `Math.tanh`.

Hot-swapping is the core interaction. Edit your code, send it to
the engine (Ctrl+Enter from VSCode), and the signal crossfades to the
new version. No click. No restart. The `s.state` array persists across
swaps — a running oscillator keeps its phase, a delay buffer keeps
its contents.

## The DSP Toolkit

Oscillators are functions that return functions:

```javascript
sin(440)        // sine wave at 440 Hz
saw(110)        // sawtooth
tri(220)        // triangle
square(440)     // square wave
pulse(440, 0.3) // pulse with 30% duty cycle
noise()         // white noise
phasor(2)       // 0-to-1 ramp at 2 Hz — the universal clock
```

Effects take a signal and return a signal:

```javascript
lowpass(signal, 800)                  // one-pole lowpass at 800 Hz
highpass(signal, 6000)                // one-pole highpass
delay(signal, 2.0, 0.5)              // delay line, 0.5s tap
feedback(signal, 2.0, 1.5, 0.7)      // feedback delay
reverb(signal, 2.0, 0.4, 0.3)        // Schroeder reverb, 30% wet
```

Composition is `pipe` and `mix`:

```javascript
// Chain: sawtooth → lowpass → reverb
pipe(saw(110), signal => lowpass(signal, 800), signal => reverb(signal, 2.0, 0.4, 0.3))

// Sum: three detuned sines
mix(sin(220), sin(220.5), sin(330))
```

## What It Sounds Like

A kick drum, hi-hats, and acid bass in 15 lines:

```javascript
const beat = phasor(130/60)
const envelope = share(decay(beat, 40))
const kick = sin(s => 60 + envelope(s) * 200)
play('kick', s => kick(s) * envelope(s) * 0.8)

const hiss = pipe(noise(), signal => highpass(signal, 6000))
play('hats', s => hiss(s) * decay(phasor(130/30), 80)(s) * 0.3)

const bpm = 130/60
const acidBeat = phasor(bpm)
const acidEnv = share(decay(acidBeat, 25))
const notes = [55, 55, 73, 55, 82, 55, 65, 55]
const acidOsc = saw(s => notes[Math.floor(s.t * bpm) % notes.length])
play('acid', pipe(
  s => acidOsc(s) * acidEnv(s) * 0.4,
  signal => lowpass(signal, s => 200 + acidEnv(s) * 3000)
))
```

A clock is a phasor. An envelope is `decay(phasor, rate)`. A sequencer
is array indexing by time. These aren't abstractions bolted on — they
fall out of the model. When everything is a function, musical structure
is just function composition.

FM synthesis — a modulator feeding a carrier:

```javascript
const mod = sin(180)
const carrier = sin(s => 340 + mod(s) * 100)
play('fm', carrier)
```

A logistic map oscillator — chaos theory as sound:

```javascript
play('chaos', s => {
  s.state[0] = s.state[0] || 0.5
  s.state[2] = (s.state[2] || 0) + 1
  if (s.state[2] >= 2000) {
    s.state[2] = 0
    s.state[0] = 3.59 * s.state[0] * (1 - s.state[0])
  }
  const freq = 200 + s.state[0] * 400
  s.state[1] = (s.state[1] + freq / s.sr) % 1.0
  return Math.sin(s.state[1] * 2 * Math.PI) * 0.3
})
```

The state array is the escape hatch. When the functional DSP toolkit
doesn't cover what you need, drop to raw sample-by-sample computation.
Write your own oscillator, your own filter, your own effect — it's
just math at 48kHz.

## Why Not SuperCollider

Traditional environments (SuperCollider, Max/MSP, PureData) use
dataflow graphs. Nodes connect to nodes. Messages schedule events.
Control rate and audio rate are separate worlds.

Aither uses plain function composition. The JIT compiles the entire
signal chain into a single tight loop. No message passing, no
scheduling overhead, no garbage collection on the hot path.

The tradeoff: no built-in GUI, no visual patching, no 30 years of
UGen libraries. What you get instead is JavaScript — the language
you already know, every npm package available, your editor, your
debugger, your workflow. The learning curve is writing functions.

---

*Aither runs on [Bun](https://bun.sh/). Source at
[github.com/rolandnsharp/aither](https://github.com/rolandnsharp/aither).*

*Co-authored with [Claude](https://claude.ai/).*
