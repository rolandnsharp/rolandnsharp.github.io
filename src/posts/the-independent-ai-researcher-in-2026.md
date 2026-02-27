---
title: "The Independent AI Researcher in 2026"
date: 2026-02-21
layout: "base.njk"
tags: post
---

# The Independent AI Researcher in 2026

Andrej Karpathy released microGPT.py — a minimal transformer in one
file. Starting from that reference implementation, we built
[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/) —
a neurosymbolic language model written in OCaml with a Forth interpreter
that constrains generation at the logit level. It trains on a single CPU
in 30 minutes. The process: Claude Code wrote most of the implementation,
Roland directed the architecture, reviewed the output, and
decided what to build next.

This is what independent AI research looks like in 2026. A home PC, an
AI coding assistant, and cycles.

---

## The Process

The workflow that produced Vidya is not pair programming in the
traditional sense. It's closer to the cyberdeck from Neuromancer —
jacking into something that knows more than you do and steering.

The loop: read a paper or textbook (Sutton's reinforcement learning,
Karpathy's microGPT, the RoPE paper). Ask Claude to explain the parts
that don't click. Ask again differently. Then direct the implementation —
what to build, what architecture to try, what the output should look
like. Claude writes the code. The human reads it, runs it, evaluates the
output, and decides whether to push forward or back up.

This produced a working OCaml transformer with rotary position
embeddings, weight tying, residual scaling, KV-cache, BPE tokenization,
a Forth-based symbolic constraint system, and TD-learned concept
associations — in days, not months. The bottleneck is no longer
implementation. It's knowing what to build.

The understanding lags behind the building. That's not a bug — it's the
new normal. The human doesn't fully understand every algorithm in the
system. But understanding accumulates through repetition, through
reading the code, through watching outputs change when architectures
change. It catches up.

Here's what comes out the other side — Vidya prompted with "what is the
Absolute?", trained on the Enneads of Plotinus, 1.25M parameters,
running on CPU:

```
$ ./microgpt_tuned --load --prompt "what is the Absolute?"
num docs: 16478
BPE: 79 chars + 500 merges = 580 vocab | 2.7 chars/token
num params: 1253888

 1: what is the Absolute?and therefore is in various of the same experiences?
 2: what is the Absolute?of this lower, but a matter of course, which it has been we
 3: what is the Absolute?and therefore is Authentic Existent.
 4: what is the Absolute?they are not merely allowed to its course, or another, in
 5: what is the Absolute?and therefore is to be seen and its intellection and
 6: what is the Absolute?of this sphere of the lower soul- as a question to remember
 7: what is the Absolute?Evil is no definite number and intervening down to its intention
 8: what is the Absolute?and as a less human being a definite shape is unless and as
 9: what is the Absolute?where there is nothing of the Soul, but a master
10: what is the Absolute?of this sphere which in a light or up it a region

total time: 3.48s
```

Not coherent by GPT-4 standards. But every word is valid, the concepts
are topically connected (Soul, Existent, intellection, Evil — all
Plotinian), and the symbolic constraint system is keeping the model on
topic with 1.25 million parameters. 3.48 seconds on a CPU. No GPU.

---

## The Landscape

The honest situation for independent AI researchers:

**Compute.** Consumer GPUs are harder to buy and more expensive than
ever. VRAM is the bottleneck — the interesting models need 24GB+, and
those cards cost thousands. Cloud GPU time adds up fast. Research that
requires training large models from scratch requires institutional
backing or deep pockets.

**Data.** The frontier models train on terabytes. Curated, cleaned,
deduplicated terabytes. Building a competitive dataset is a full-time
job. The open datasets (Common Crawl, The Pile, RedPajama) exist, but
wrangling them requires compute you may not have.

**Papers.** A troubling fraction of published ML papers don't follow
basic scientific methodology — no proper ablations, cherry-picked
metrics, results that don't reproduce. Sci-Hub is how most researchers
actually read the literature. The papers available for free are often
better vetted (arXiv preprints with public code) than the ones behind
$40 paywalls.

---

## What Still Works

**Small models are underexplored.** Vidya has 1.25 million parameters
and produces coherent philosophical text. Not because 1.25M parameters
is enough for general intelligence — it isn't — but because a small
model constrained by a symbolic system can do things that a small model
alone cannot. The research question "what can you do with structure + a
tiny model?" is wide open and requires exactly zero H100s to investigate.

**CPUs are fast enough.** Vidya trains 100K steps across 16K documents
in 30 minutes on a laptop CPU. BLAS libraries give you
hardware-optimized matrix multiplication for free. For models under 10M
parameters, a GPU is unnecessary.

**Languages matter.** OCaml compiles to fast native code with a precise
memory model. C FFI is trivial. No Python overhead, no framework
abstraction tax, no CUDA dependency chain. The whole model is one binary.

**AI assistants change who can do research.** The prerequisite is no
longer "can write a transformer from scratch." It's "knows what a
transformer is, what it should do, and how to tell whether it's working."
The implementation gap between an idea and a working system has collapsed.
What remains is taste — which ideas are worth pursuing, which
architectures fit the problem, when the output looks wrong.

---

## The Race

The frontier is moving fast. The question for an independent researcher
isn't "can I compete with Google DeepMind?" — obviously not, not on
scale. The question is: are there ideas that don't require scale?
Neurosymbolic architectures. Novel constraint systems. Alternative
substrates. Small models doing things large models can't because they
have structure that large models don't.

That's where the interesting work is. And it can be done from home,
plugged in, pushing cycles.

---

*See also: [Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Reinforcement Learning](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/),
[Forth9](/posts/forth9-the-lisp-forth-machine-that-fits-in-your-pocket/),
[Aither](/posts/aither-live-coding-audio-synthesis-in-javascript/).*

*Co-authored with [Claude](https://claude.ai/).*
