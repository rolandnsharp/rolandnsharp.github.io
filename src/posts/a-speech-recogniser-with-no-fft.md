---
title: "A Speech Recogniser With No FFT: 10M Parameters, One C File, Faster Than Sherpa on a Handheld"
date: 2026-11-04
layout: "base.njk"
tags: post
---

# A Speech Recogniser With No FFT: 10M Parameters, One C File, Faster Than Sherpa on a Handheld

```
$ zara-dictate
STUFFERD INTO YOU HIS BELLY COUNSELED HIM
= STUFFED INTO YOU HIS BELLY COUNSELED HIM
```

That's a speech recogniser I trained from scratch. It runs live on my
[uConsole](https://www.clockworkpi.com/uconsole), a handheld Linux computer with a slow ARM chip.
Letters appear while you're still talking. When you pause, a word-level language model
cleans up the line.

It has 10.4 million parameters and lives in one C file with no dependencies. It has no
FFT, no mel spectrogram, no convolutions and no attention. The final training run cost
**$7.37** on a rented RTX 3090. On one of the uConsole's slow Cortex-A53 cores it runs
**1.4× faster than sherpa-onnx's streaming Zipformer**, the usual choice for offline
speech recognition on small devices.

It's on Hugging Face: [rolandnsharp/oscillator-asr](https://huggingface.co/rolandnsharp/oscillator-asr).
Every experiment that led to it, failures included, is
[pre-registered and written up](https://experiments.blah.dev/EXP-0049).

---

## Why build one?

Whisper is excellent, but it was built for GPUs and for 30-second windows. On the
uConsole, `whisper.cpp` tiny.en takes **4.5 seconds per second of audio** on one A53
core. You talk, you wait, then the text arrives all at once.

I wanted something that streams: text as you speak, at a fixed cost per second of
audio, on the slow cores that stay on when the machine runs on battery. That rules out
attention, whose cost grows with the length of the audio. It points at recurrence.

And I had a specific idea about what to recur.

---

## Hearing with oscillators

The standard front end for speech is a mel spectrogram. You chop the audio into windows,
run an FFT on each, and pool the result into frequency bands shaped like the human ear.
It works, but it's a fixed, hand-designed transform followed by a learned model.

This model replaces it with a **bank of 64 damped complex oscillators**, running at the
audio sample rate (16 kHz):

```
z_t = c · z_(t-1) + x_t        c = exp(−dt/τ + 2πi·f·dt)
```

Each oscillator is a resonator. Every incoming sample kicks it, and it rings at
frequency `f` and decays with time constant `τ`. Both are **learned**. Every 20 ms the bank's state becomes
the feature vector: the real part, the imaginary part and the energy of each
oscillator. There's no window, no FFT and no matrix, just 64 complex multiply-adds per
sample.

This is the same idea as my earlier [Resonance](/resonance-a-neural-network-built-from-one-equation/)
network and my audio language [aither](/complex-numbers-arent-imaginary/): a complex number as a
rotating physical quantity rather than an "imaginary" one. Here the oscillators learn their own
tuning from speech, from about 40 Hz up to 8.9 kHz, with decay times from a third of a
millisecond to a second.

Above the front end there are six recurrent blocks at 50 Hz. Each holds 224 complex poles of the same form,
a diagonal linear recurrence in the family of S4D and LRU, with a SiLU gate and a gated
MLP after it. The state is a fixed size, so cost and memory per second of audio are
constant. A CTC head outputs characters. A prefix beam search with LibriSpeech's 3-gram
language model, also written in the C file, re-decodes each phrase when you pause.

---

## The part where it didn't work

The model has been through six rounds. The first plateaued at 86% word error rate (WER).
Round 3 got to 38.6% WER on its own (greedy decoding), and 19.4% with the language model. The
shape was right; the numbers weren't good enough to release.

Then I made a decision that cost a week: **the release had to contain only my own code.**
Round 3's recurrent block came from a collaborator's project. So I rewrote it from the
open literature, as a plain diagonal complex recurrence with standard AdamW, and trained it
at round 3's exact budget.

It was much worse. **50.9% WER**, against round 3's 38.6%.

The obvious suspect was the new block. The first evaluation, though, showed it
*learning slowly* rather than plateauing early, which smelled like the optimizer. So the next
experiment changed only the learning rate and warmup, to match round 3's schedule. The prediction
was that this would close most of the gap.

It didn't: **49.1%**. The prediction was refuted, and the write-up says so.

The real difference was hiding in round 3's optimizer. It applied an *orthogonalised*
update to its weight matrices, the idea behind
[Muon](https://kellerjordan.github.io/posts/muon/) (Jordan et al., 2024). So I wrote my own
Muon from the paper. You take the momentum, push its singular values towards 1 with five steps of a quintic
Newton–Schulz iteration, and scale the result to AdamW's update size so both optimizers
share one learning rate.

Same block, same rate, same budget: **33.8%**. That's better than round 3, on a block
that's now entirely mine. The block was never the problem; the update rule was.

| run | optimizer | test-clean WER (greedy) |
|---|---|---|
| round 3 (old block) | orthogonalised updates | 38.6% |
| own block | AdamW, 1.5e-3 | 50.9% |
| own block | AdamW, 3e-3, short warmup | 49.1% |
| own block | **Muon** (my implementation) | **33.8%** |

---

## Then: just train it properly

Round 3 had seen the training data about twice. Published LibriSpeech models train for
dozens of passes. So the release run was 10.4M parameters (six blocks instead of four),
150,000 updates, about 11 passes over 960 hours of LibriSpeech, in one uninterrupted
schedule.

The prediction I registered before launch was 20–27% greedy and 10–14% with the
language model.

Two things went wrong on the way:

- **The data download stalled.** Three hours into the run, the LibriSpeech mirror throttled the
  rented GPU's address to 50 KB/s. The pod could still reach Hugging Face at 22 MB/s, and my
  own server could reach the same mirror at 35 MB/s. So the server downloaded the remaining 50 GB or so and
  streamed it straight into the pod over SSH, without storing anything on its own nearly full
  disk.
- **The scoring said the model was broken.** The first results from the C program were
  37.6% WER, against 16.8% from PyTorch on the same model. The cause was
  `-ffast-math`. A few channels of this model's residual stream reach about 100,000, and
  fast-math's assumption that infinities never happen quietly corrupted the output of
  the x86 build. Adding `-fno-finite-math-only` made the C program match PyTorch exactly.
  The ARM build on the uConsole had never been affected, and the bug is recorded as a
  deviation in the experiment rather than quietly fixed.

The final numbers beat the prediction on every count:

| LibriSpeech, whole test sets | round 3 | **this model** |
|---|---|---|
| test-clean, greedy | 38.6% | **16.8%** |
| test-clean, + 3-gram LM | 19.4% | **9.1%** |
| test-other, greedy | 62.1% | **37.9%** |

---

## Speed on the uConsole

Speed is measured as the real-time factor: compute seconds per second of audio, so lower is faster.
These are one core, 87 seconds of test audio, all models in the same session, with model and
language-model loading included:

| recogniser | streaming | A72 core | A53 core | WER on these 12 clips |
|---|---|---|---|---|
| **this model**, int8 + 3-gram | yes, 320 ms | **0.16** | **0.35** | 7.7% |
| sherpa-onnx Zipformer 20M, int8 | yes | 0.21 | 0.48 | 8.6% (no LM) |
| whisper.cpp tiny.en | no | 2.26 | 4.49 | 5.0% |

On the slow core it is 1.4× faster than sherpa, with half the parameters, at similar
accuracy on these twelve clips (too few to rank them). It is about 13× faster than Whisper
tiny, which is still more accurate.

---

## What it isn't

This is a research model, and the limits are real:

- **9.1% on clean read speech is well behind the state of the art.** Small published models get 2–5%, and
  Whisper is better than this model at everything except speed.
- **It's trained on LibriSpeech only.** That means read audiobooks, so accents, noisy rooms and
  modern vocabulary are weaker.
- **There's no punctuation or capitalisation.**
- **Size and training length changed together**, so I can't tell you which of them
  bought the improvement.

The claim is narrower: a recurrent model built from learned oscillators can stream
speech recognition on a weak CPU faster than the standard small model, from a single C
file, trained for less than the price of lunch.

---

## How it was built

I directed this project with Claude Code as the implementation partner, the same way I
build everything now. I chose the architecture, the experiments and the release rule. The
agent wrote most of the code, ran the pods and caught a good share of the bugs. I read all
of it and decided what each result meant.

The part I'd recommend to anyone: **write the prediction down before you spend the
compute.** Every run here was pre-registered on
[experiments.blah.dev](https://experiments.blah.dev/EXP-0049), with numeric
predictions and what would refute them. Four of the six experiments in this story were
refuted: two in my favour, and two that sent me looking elsewhere. The AdamW learning-rate run
is the one that sent me to the optimizer, and I wouldn't have trusted that conclusion without
having written down what I expected first.

---

## Try it

```sh
hf download rolandnsharp/oscillator-asr --local-dir oscillator-asr && cd oscillator-asr
cc -O3 -ffast-math -fno-finite-math-only -o zara_stt zara_stt.c -lm
./zara_stt model.bin speech.wav --int8 --lm librispeech-3gram.zlm --alpha 0.7 --beta 1.0
```

The input is a 16 kHz mono WAV, or a live microphone with `--stream`. The training code, the
optimizer and the export scripts are in the same repository, and the experiments are in
[rolandnsharp/experiments](https://github.com/rolandnsharp/experiments).

---

*See also:
[Resonance: a neural network built from one equation](/resonance-a-neural-network-built-from-one-equation/),
[Complex numbers aren't imaginary](/complex-numbers-arent-imaginary/).*

*Co-authored with [Claude](https://claude.ai/).*
