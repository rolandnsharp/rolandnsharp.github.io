---
title: "The Independent AI Researcher in 2026"
date: 2026-02-21
layout: "base.njk"
tags: post
---

# The Independent AI Researcher in 2026

Andrej Karpathy released microGPT.py — a minimal transformer in one
file. I sat down with Claude Code, walked through every line, asked
questions until I understood the architecture, then rewrote the whole
thing in OCaml with C FFI for BLAS-accelerated matrix operations. That
OCaml implementation became
[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/) —
a neurosymbolic language model that trains on a single CPU in 30 minutes.

This is what's possible right now as an independent researcher with
a home PC and an AI coding assistant.

---

## The Acceleration

Working with Claude Code doesn't feel like using a tool. It feels like
pair programming with someone who has read every textbook and every paper
and remembers all of it. You describe what you want to understand, and
you get an explanation calibrated to your level. You describe what you
want to build, and you get working code you can interrogate and modify.

The loop is: read a paper, ask Claude to explain the parts I don't
follow, implement it, ask Claude to review the implementation, run it,
study the output, alter the architecture, repeat. What used to take
weeks of staring at papers and debugging tensor shapes now takes hours.
The learning hasn't gotten shallower — it's gotten denser. More
iterations per day. More hypotheses tested per week.

Going from Karpathy's Python microGPT to a working OCaml transformer
with rotary position embeddings, weight tying, residual scaling, KV-cache,
and BPE tokenization — then adding a Forth-based symbolic constraint
system on top — took days, not months. Not because the work was trivial.
Because the bottleneck shifted from "how do I implement this" to "what
should I try next."

---

## The Landscape

The honest situation for independent AI researchers:

**Compute.** Consumer GPUs are harder to buy and more expensive than
ever. VRAM is the bottleneck — the interesting models need 24GB+, and
those cards cost thousands. Cloud GPU time adds up fast. If your research
requires training large models from scratch, you need institutional
backing or deep pockets.

**Data.** The frontier models train on terabytes. Curated, cleaned,
deduplicated terabytes. Building a competitive dataset is a full-time
job. The open datasets (Common Crawl, The Pile, RedPajama) exist, but
wrangling them requires compute you may not have.

**Papers.** A troubling fraction of published ML papers don't follow
basic scientific methodology — no proper ablations, cherry-picked
metrics, results that don't reproduce. Yet the papers are locked behind
paywalls. Sci-Hub is how most researchers actually read the literature.
This is the state of scientific publishing in 2026: the papers you can
access for free are often better vetted (arXiv preprints with public
code) than the ones behind $40 paywalls.

---

## What Still Works

The constraints above are real. But they're not the whole story.

Small models are underexplored. Vidya has 1.25 million parameters and
produces coherent philosophical text. Not because 1.25M parameters is
enough for general intelligence — it isn't — but because a small model
constrained by a symbolic system can do things that a small model alone
cannot. The research question "what can you do with structure + a tiny
model?" is wide open and requires exactly zero H100s to investigate.

CPUs are fast enough. Vidya trains 100K steps across 16K documents in
30 minutes on a laptop CPU. BLAS libraries (OpenBLAS, Apple Accelerate)
give you hardware-optimized matrix multiplication for free. For models
under 10M parameters, you don't need a GPU at all.

Languages matter. OCaml compiles to fast native code with a precise
memory model. C FFI is trivial. You get the rapid iteration of a
high-level language with the performance of a systems language. No
Python overhead, no framework abstraction tax, no CUDA dependency
chain. The whole model is one binary.

AI assistants are a force multiplier. The gap between "I understand the
math" and "I have a working implementation" used to be weeks of
debugging. Now it's a conversation. The researcher's job hasn't changed
— you still need to know what questions to ask, what architecture to
try, what results mean. But the implementation friction has dropped by
an order of magnitude.

---

## The Race

I'm not complaining about any of this. The barriers are real and the
advantages of institutional labs are enormous. But the tools available
to independent researchers in 2026 would have seemed absurd five years
ago. A coding assistant that understands transformer architectures. Open
model weights. Open papers on arXiv. CPUs fast enough to train small
models in minutes. A compiler ecosystem that produces fast binaries
without GPU dependencies.

The frontier is moving fast. The question for an independent researcher
isn't "can I compete with Google DeepMind?" — obviously not, not on
scale. The question is: "are there ideas that don't require scale?"
Neurosymbolic architectures. Novel constraint systems. Alternative
substrates. Small models doing things large models can't because they
have structure that large models don't.

That's where the interesting work is. And you can do it from home.

---

*See also: [Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Reinforcement Learning](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/),
[Forth9](/posts/forth9-the-lisp-forth-machine-that-fits-in-your-pocket/),
[Aither](/posts/aither-live-coding-audio-synthesis-in-javascript/).*

*Co-authored with [Claude](https://claude.ai/).*
