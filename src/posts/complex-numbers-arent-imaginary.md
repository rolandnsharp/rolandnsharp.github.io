---
title: "Complex Numbers Aren't Imaginary: How a Forgotten Engineer Made Our Audio Language Faster"
date: 2026-04-27
layout: "base.njk"
tags: post
---

# Complex Numbers Aren't Imaginary: How a Forgotten Engineer Made Our Audio Language Faster

Aither is a small language for audio synthesis: a patch is a function
of state that returns one sample, run 44,100 or 48,000 times a second.
It needs complex arithmetic for the usual reasons: frequency shifting,
Hilbert transforms, resonant filters, phase that can be rotated
exactly. This post explains how aither provides that arithmetic
without a complex type, where the idea comes from, and which of the
several mathematical conceptions of ℂ the language commits to.

## Steinmetz's phasor

In August 1893 Charles Proteus Steinmetz, a young engineer who would
spend his career at General Electric, presented the paper "Complex
Quantities and Their Use in Electrical Engineering" to the
International Electrical Congress in Chicago. His book *Theory and
Calculation of Alternating Current Phenomena* (1897, with Ernst Berg)
developed the method at length.

The method is the **phasor**. A steady sinusoid `A cos(ωt + φ)` is
represented by the complex number `A e^(jφ)`: a point in the plane
whose length is the amplitude and whose angle is the phase. (Engineers
write `j` because `i` is current.) Steinmetz read `j` operationally,
as a rotation by a quarter turn, and that reading does the work:
differentiation becomes multiplication by `jω`, an inductor or
capacitor becomes a complex impedance, and the differential equations
of an AC network become algebra on points. Electrical engineering has
calculated this way ever since.

Nothing in the method is imaginary in the everyday sense. The
quantities being described are real voltages and currents. The complex
number is an exact bookkeeping device for two real numbers in fixed
quadrature, together with the rules for rotating and scaling them.

That reading is the design principle aither is built on: a complex
number is a pair of reals plus a small set of operations that treat
the pair as one rotating point.

## Operations, not a type

Aither has no complex type. Every value is a pair of doubles; a plain
number is a pair whose two sides are equal. Ordinary arithmetic
(`+ - * /`) works side by side, so stereo arithmetic means what it
looks like. A pair is read as a complex number only by the operations
that turn it ([SPEC.md, "Pairs"](https://github.com/rolandnsharp/aitherLang/blob/main/SPEC.md)):

| operation      | what it does                                              |
|----------------|-----------------------------------------------------------|
| `turn(z, w)`   | complex multiplication: `z` rotated by `w`'s angle, scaled by its length |
| `unturn(z, w)` | complex division                                          |
| `conj(z)`      | the conjugate: the same point turning the other way       |
| `amplitude(z)` | the modulus                                               |
| `phase(z)`     | the argument                                              |
| `analytic(x)`  | a real signal paired with its Hilbert transform           |

Everything else is ordinary aither in the standard library:

```
def spin(freq):
  let a = TAU * phasor(freq)
  [cos(a), sin(a)]
def rotate(z, angle): turn(z, [cos(angle), sin(angle)])
def freq_shift(signal, hz): turn(analytic(signal), spin(hz))
```

The compiler emits C, and `turn` becomes the textbook expression,
inlined where it is used:

```c
(a0 * b0 - a1 * b1), (a0 * b1 + a1 * b0)
```

This is not a speed advantage over a good complex type. C++'s
`std::complex<double>` and Julia's `Complex{Float64}` are plain value
types that compilers keep in registers. The difference is in the
language's surface. Because there is one kind of value, nothing
converts between "a stereo pair" and "a complex number". The pair a
patch returns is read by whatever consumes the engine's output: a
player hears left and right, the oscilloscope tool draws x and y, and
an SDR transmitter takes I and Q, where `turn` by a spin is a
frequency shift and `amplitude` is the AM envelope. The language names
none of these readings.

## Where it is used in audio

The design and its measurements are written up in
[PHASORS.md](https://github.com/rolandnsharp/aitherLang/blob/main/PHASORS.md).
In brief:

**The analytic signal.** A real signal has no direction to turn in.
Gabor's analytic signal (1946) gives it one: pair the signal with its
Hilbert transform, a copy a quarter turn behind at every frequency, and
each component becomes a point turning at its own frequency, with only
positive frequencies present. `analytic(x)` approximates the Hilbert
transform with two parallel chains of four all-pass sections (Olli
Niemitalo's coefficients) whose outputs stay about 90° apart
across the audio band; at 48 kHz it is clean above roughly 30 Hz. The
pair's length is the instantaneous envelope and its rate of turning
the instantaneous frequency, `phase(turn(p, conj(prev(p)))) / (TAU * dt)`.
On a synthesised voice gliding from 150 to 300 Hz, that pitch estimate
had a mean error of 0.93% against 0.69% for zero-crossing counting:
close, with a reading every sample and no state machine.

**Frequency shifting.** `freq_shift(signal, hz)` turns the analytic
signal by a spin, which adds `hz` to every frequency, with no mirror
image below. This is single-sideband modulation by the phasing method
that Ralph Hartley developed for radio in the 1920s. Because hertz are
added rather than multiplied, harmonics stop being harmonic: a shifted
voice turns metallic, a chord bell-like. Frequency shifters are a
standard effect: SuperCollider ships one as the `FreqShift` UGen, and
Csound's manual builds one from its `hilbert` opcode. What aither adds
is not the effect but the fact that it is a one-line definition over
general operations rather than a dedicated unit, so its parts are
available separately. The
[`gaelic_ladder`](https://github.com/rolandnsharp/aitherLang/blob/main/patches/gaelic_ladder.aither)
patch takes one analytic signal of its lower layers and uses it twice:
`turn(pair, spin(37))` for a halo shifted 37 Hz, and `turn(pair, pair)`
for the layer above it.

**Squaring, and its limits.** Turning a pair by itself doubles its
angle. For a single sinusoid, `A e^(iωt)` squared is `A² e^(2iωt)`: an
octave up, phase-locked to the source, with the amplitude squared
(divide by `amplitude(p)` to keep the level). It is a clean octave
only for a single sinusoid. For a signal with several components the
square contains every pairwise sum frequency. A harmonic tone at f₀
lands on 2f₀, 3f₀, 4f₀ and so on, which is a brighter spectrum rather
than a transposition, and the ear may still hear it at f₀. A chord
gives intermodulation products. In `gaelic_ladder` that is the
intended effect; as a general octave doubler it is not one.

**Resonators as complex one-pole filters.** The damped harmonic
oscillator, `x'' = force − 2·damp·w·x' − w²·x`, is the resonance
behind aither's `resonator`, its bell patches and its vocoder bands. Its free
motion is a point turning at `wd = w·√(1 − damp²)` while shrinking by
`exp(−damp·w)` per second. So `dho` advances it exactly, as one
complex multiply per sample plus the input:

```
$z = turn($z, exp(-damp * w * dt) * [cos(wd * dt), sin(wd * dt)]) + [0, -force * dt / wd]
```

This is the "phasor filter" Max Mathews and Julius Smith described for
very high-Q resonators that stay well behaved however they are tuned.
It replaced a semi-implicit Euler step that bounds energy but distorts
the orbit as frequency rises and diverges once `w·dt` passes 2. Driven
at its own frequency, the old step's phasor length ranged 0.28 to 0.44
at 6 kHz and ran away at 18 kHz; the turning version holds 0.50 to
0.53 at 6 kHz and is stable at 18 kHz. `dho` returns the whole pair,
so a resonator's envelope is its `amplitude`, with no rectifier and
smoothing filter (a crystal set's diode and earphone) needed to
recover it.

**Steady sines.** The same view gives the one speed claim in this post.
`sin(TAU * phasor(f))` with `f` constant over a block is a point
turning by a fixed angle each sample, so the compiler keeps the point
and turns it: four multiplies per sample instead of a sine, with one
Newton step per sample to hold its length at 1. This is the recursive
rotation oscillator of the DSP literature, applied only where the
frequency cannot change within a block; vibrato and FM keep the sine.
It matches the sine to within 1e-9. Measured live on the uConsole's
ARM CPU (`cc -O2`, 28 October 2026), `acid_lead` went from 64% to 43%
of a core and `complex_pad` from 16% to 6%.

## Which ℂ?

A fair objection is that aither plainly has complex values; it has
only declined to name their type. The more precise answer is that
"the complex numbers" is not one structure. Joel David Hamkins, in
*Lectures on the Philosophy of Mathematics* (2021), distinguishes
several conceptions of ℂ, which differ in what structure is taken as
given and therefore in their symmetries:

- **Algebraic**: ℂ as a field and nothing more, characterised up to
  isomorphism as the algebraically closed field of characteristic zero
  with the cardinality of the continuum. It has an enormous number of
  automorphisms; even ℝ is not a distinguished subfield.
- **Analytic** and **smooth**: ℂ with ℝ distinguished, or with its
  topology or smooth structure. The automorphisms are the identity and
  conjugation, so `i` and `−i` cannot be told apart.
- **Rigid**: ℂ with its real and imaginary coordinates given. The only
  automorphism is the identity; `i` is a definite point.

Aither implements the rigid conception. The first side of a pair is
the real part and the second the imaginary part. Positive frequency is
anticlockwise, `e^(+iωt) = [cos, sin]`, which is `spin(hz)`, and
everything that turns (`spin`, `analytic`, `rotate`, `dho`) turns that
way. `conj` is an operation a patch can apply, not a symmetry the
language is indifferent to: conjugating an analytic signal moves its
content to negative frequencies. Swapping the I and Q of an SDR stream
mirrors its spectrum, which a listener hears at once.

A type in most languages describes the operations a value supports,
which matches the algebraic or analytic conception well. The rigid
conception needs something different: fixed coordinates and a fixed
orientation. In aither those are just the pair's slot order and the
sign convention its operations use, so no type is needed to carry them.

## Why the rigid conception

The reason is that aither describes classical systems. A patch is a
deterministic state update of real quantities: oscillators, springs,
filters and delay lines, whose output is a pressure signal at a
speaker. In classical physics and engineering, complex numbers
represent real quantities, and the real part is what is measured. That
representation requires choices: which component is real, and which
sign of `i` means forward in time. Engineering writes `e^(+jωt)`; much
of physics writes `e^(−iωt)`. Either works, but each formula is
correct only under one of them, so the choice has to be fixed and then
honoured everywhere. That is the rigid conception in practice.

Steinmetz worked in the same setting. His phasors stand for real
voltages and currents, his `j` is a definite quarter turn, and the
direction of rotation has a physical meaning. Aither inherits that
discipline rather than an abstract field structure. The conception
fits all the way through: the pair layout, the operations, the output
format, and the medium itself, since a sound wave has a definite phase
and a definite direction of time.

We did not choose the conception by comparing all of them in advance.
We followed the engineering tradition, and only later, asked to
justify it, set it against the alternatives. The justification is
coherence rather than proof: the conception matches the systems the
language describes.

---

*Aither is at [github.com/rolandnsharp/aitherLang](https://github.com/rolandnsharp/aitherLang).
The pair operations are specified in
[SPEC.md](https://github.com/rolandnsharp/aitherLang/blob/main/SPEC.md),
the phasor design, measurements and references are in
[PHASORS.md](https://github.com/rolandnsharp/aitherLang/blob/main/PHASORS.md),
and the wider design philosophy is in
[PHILOSOPHY.md](https://github.com/rolandnsharp/aitherLang/blob/main/PHILOSOPHY.md).
Steinmetz's 1893 paper is in the Proceedings of the International
Electrical Congress, Chicago; his books "Theory and Calculation of
Alternating Current Phenomena" (1897) and "Engineering Mathematics"
(1911) are available as scans on the Internet Archive.*

*Co-authored with [Claude](https://claude.ai/).*
