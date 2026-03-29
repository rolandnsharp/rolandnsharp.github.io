---
title: "Resonance: A Neural Network Built from One Equation"
date: 2026-03-29
layout: "base.njk"
tags: post
---

# Resonance: A Neural Network Built from One Equation

> "If you want to find the secrets of the universe, think in terms of energy, frequency and vibration."
> — Nikola Tesla

## The Problem with Tokenizers

Every modern neural network begins with the same awkward step: take continuous reality and chop it into discrete pieces. Text becomes subword tokens. Audio becomes mel spectrogram bins. Images become pixel patches. We discretize continuous signals just to immediately embed them back into continuous vectors.

This is a hack. A necessary one — but a hack nonetheless.

What if the network itself was built from the same physics as the signals it processes?

---

## One Equation

A damped, driven harmonic oscillator:

```
ẍ + 2γẋ + ω²x = F(t)
```

This is the equation of a guitar string. A radio antenna. A retinal cone responding to light. A seismometer detecting earthquakes. An LC circuit tuning a frequency. Tesla's coil transferring energy through resonance.

Its frequency response — the transfer function — is:

```
H(ω) = 1 / (ω₀² - ω² + 2iγω)
```

Peaked at the natural frequency ω₀, width controlled by the damping γ. When the input frequency matches the oscillator's natural frequency, the response is large. When mismatched, it's small.

That's selective attention. Not as a metaphor — as physics.

---

## Architecture

The entire network is three stages, all built from the same oscillator primitive:

**Analyze.** A bank of learnable oscillators decomposes the input signal. Each oscillator has a natural frequency ω₀ and damping γ — both learned during training. The input signal drives the bank, and each oscillator responds according to its transfer function. Implemented via FFT: multiply the input spectrum by the transfer functions, then IFFT back to time domain. Exact, parallel, no sequential time stepping.

**Process.** The oscillator responses pass through attention layers. Because the representations live in oscillator state space, attention naturally operates on frequency relationships. Oscillators at similar frequencies produce similar state vectors, so they attend to each other. This is resonance-based information routing — the same mechanism Tesla used to wirelessly transmit energy between tuned circuits.

**Synthesize.** The processed oscillator states are projected to per-oscillator weights — both amplitude and phase — and the output is a weighted sum of the oscillator responses. This is additive synthesis: the same technique used in every synthesizer, every radio transmitter, every laser. The output is physically constrained to be a sum of oscillations.

No tokenizer. No discrete vocabulary. No positional encoding — phase handles position naturally. The learnable parameters are oscillator frequencies, damping coefficients, and the attention weights that route between them.

The core of the encoder in Python — the entire thing:

```python
def transfer_function(omega0, gamma, omega):
    """H(ω) = 1 / (ω₀² - ω² + 2iγω)"""
    return 1.0 / (omega0 ** 2 - omega ** 2 + 2j * gamma * omega)
```

---

## Why Oscillators?

Three reasons.

**Universality.** The damped harmonic oscillator isn't specific to sound. Change ω₀ from 440 Hz to 2.4 GHz and you're processing WiFi signals. Change it to 10¹⁴ Hz and you're processing light. The same architecture, the same equation, the same code — just different frequencies. Sound waves, radio waves, light waves, neural oscillations, seismic waves, gravitational waves. Anywhere something vibrates, this architecture applies.

**Elegance.** The conventional transformer stack is a Frankenstein of independently motivated components: learned embeddings, positional encodings, layer normalization, softmax attention, feed-forward networks, residual connections. Each solves a problem, but they don't share a unifying principle.

An oscillator network has one principle. The transfer function handles encoding. Resonance handles attention. Additive synthesis handles decoding. Damping handles regularization. Phase handles position. The entire architecture is one equation applied at different scales.

**Hardware.** This is where it gets exciting.

---

## The Hardware Future

Research groups are building oscillator-based computing chips — analog processors where computation happens through the physical dynamics of coupled oscillators. Vanadium dioxide (VO2) oscillators. Spin-torque nano-oscillators. CMOS ring oscillator arrays.

On these chips, computation isn't clocked arithmetic. It's physics settling to equilibrium. Oscillators synchronize (or don't) based on their frequency relationships, and the synchronization pattern IS the computation.

The problem: no one has built a general neural network architecture that maps cleanly onto this hardware. Most oscillator computing demos are limited to associative memory and simple optimization. The software doesn't match the hardware.

Our architecture is that missing software. Every component maps to a physical oscillator operation:

- **Encoder** — drive physical oscillators with the input signal. Their physical resonance IS the transfer function. No computation needed — just physics responding.
- **Attention** — couple the oscillators. Ones at similar frequencies synchronize. That's resonance-based attention implemented by wires, not multiply-accumulate units.
- **Decoder** — read out oscillator amplitudes. Sum them. That's additive synthesis — superposition of waves.

The forward pass becomes the time it takes a physical oscillator to ring up and settle. Nanoseconds, not milliseconds. Microjoules, not watts.

Tesla imagined a world powered by resonance — energy transmitted wirelessly between tuned circuits, information carried on vibrations. A century later, oscillator chips might finally make that vision computational.

---

## Early Results

We trained the network on synthetic vowel signals — sums of harmonics shaped by formant resonances. Vowels are the perfect test case because the human vocal tract IS a bank of damped oscillators. The signal we're asking the network to process was generated by the same physics the network is built from.

The task: denoise. Take a clean vowel, add noise, and ask the network to recover the clean signal. A 2.1M parameter model (128 oscillators, 4 attention layers) trained for 10,000 steps on synthetic data:

```
noisy input:  7.8 dB SNR
model output: 10.8 dB SNR
improvement:  +3.0 dB
```

The model is actively removing noise — not just passing the signal through.

The oscillator bank learns meaningful structure during training. Higher-frequency oscillators develop lower damping (ζ=0.17 at 8.4 kHz) — sharp, selective resonances. Lower frequencies settle into broader damping (ζ=0.40). The bank self-organizes into a multi-resolution filterbank without being told to. It learned the physics of spectral analysis from the signal alone.

This is a proof of concept, not a state-of-the-art result. But the architecture works: signal goes in, oscillators decompose it, attention processes the oscillator states, and a cleaner signal comes out. The whole thing is ~280 lines of Python.

---

## Update: The Oscillator Speaks English

Since the initial audio results, we took the architecture somewhere unexpected — language modeling. The same transfer function that processes waveforms can process text.

**Causal Oscillator Encoding.** Each token drives the oscillator bank as a physical impulse. The damped impulse response h(t) = e^{-γt} sin(ωd·t) / ωd creates temporal context — recent tokens ring loudly, distant tokens have decayed through damping. This is implemented as causal convolution via FFT. Attention layers then operate on these physics-enriched states for long-range dependencies.

The physics handles local context through resonance. Attention handles global context. The division of labor mirrors biology: oscillatory dynamics provide temporal structure, synaptic connections provide long-range communication.

**Results on FineWeb** (the [OpenAI Parameter Golf](https://openai.com/index/parameter-golf) benchmark):

```
Val BPB:       1.34 (baseline transformer: 1.22 at same param count)
Round-trip:    1.34 (after int8 quantization + decompression)
Parameters:    14.8M
Compressed:    ~11.2MB (limit: 16MB)
```

The model generates coherent English:

> "Once upon a time, a simple dessert made, watercress, potatoes, salads, basil, olives, red onion, crispy ginger, salt, pepper, and turmeric to remove vegetables from the surface..."

> "In the year we're awarded 3,000 rental plans in the United States. Once we've completed 15,000 rental plans on 3,000 rental plans, we'll help you achieve the best rental plans for your needs."

This was developed on ~$20 in compute credits over 2 days, with no hyperparameter sweeps, no EMA, no int6 quantization, no test-time training. The BPB reflects a novel architecture with minimal optimization.

**Competition submission:** [openai/parameter-golf#1061](https://github.com/openai/parameter-golf/pull/1061)

---

## Why This Matters

One equation processes both text and audio. No other architecture does both from a single primitive.

Text is not the oscillator's native domain — waves are. The language modeling results demonstrate the architecture is competitive on text. But where it shines is its native land of waves — where every parameter (frequency in Hz, damping ratio) is directly physically interpretable and the forward pass maps to analog oscillator hardware.

The transfer function doesn't care what the signal represents. It decomposes whatever structure exists. You change ω and the same architecture tunes to a different domain: speech, music, radio, EEG, vibration, seismic. The same 300 lines of PyTorch, the same equation, the same training loop.

The vision: a single architecture that listens (audio oscillator bank), thinks (causal attention over oscillator states), speaks (additive synthesis from oscillator responses), and reads/writes (causal impulse encoding for text). Not four separate models bolted together — one equation, applied at different frequencies.

Maybe the right architecture for understanding the world was always made of the same physics as the world.

---

Code: [github.com/rolandnsharp/resonance](https://github.com/rolandnsharp/resonance)

Inspired by [Oscillators Are All You Need](https://anonymous.4open.science/r/contiformer-2-C8EB) (ICLR 2026)
