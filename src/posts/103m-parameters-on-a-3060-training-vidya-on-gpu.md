---
title: "103M Parameters on a 3060: Training Vidya on GPU"
date: 2026-03-20
layout: "base.njk"
tags: post
---

# 103M Parameters on a 3060: Training Vidya on GPU

```
initialising model on GPU...
  102,994,944 params in 1.82s
running forward pass...
  loss = 10.8820 in 0.15s
```

That's Vidya — our neurosymbolic language model — running a 103 million
parameter forward pass on a single consumer GPU in 150 milliseconds. The
entire stack is ours: Nim, direct CUDA calls, cuBLAS, hand-rolled kernels.
No PyTorch. No frameworks. Built in one session with Claude Code.

We started the day in OCaml. We ended it in Nim. Here's why.

---

## Why This Matters

Last week I watched a talk by Dale Schuurmans where he made a point that
reframed everything I've been building.

The argument: LLMs are already universal computers. A random untrained
transformer can simulate any Turing machine. Pre-training doesn't change the
computational ability — it just makes the interface usable. The real problem
is that each token gets a constant compute budget (one pass through the
transformer), and you cannot compile a linear-time algorithm into a constant-
time circuit. That's why LLMs fail at reasoning. That's why they guess instead
of compute. That's why chain-of-thought helps — it gives the model more steps,
more compute, more time to actually work through the problem.

But here's what he didn't say: the same bottleneck is why LLMs can't remember.

Every conversation starts from the same frozen weights. The only "memory" is
the context window, which gets wiped between sessions. There's nowhere to write.
The model can compute, but it can't learn from what it computes. It's a computer
with no disk.

We're building the disk.

---

## The Architecture

Vidya is a GPT-2 style transformer — but wider and shallower than the original,
tuned for our hardware and our experiments:

| | Old Vidya | New Vidya |
|---|---|---|
| Parameters | 49M | 103M |
| Layers | 12 | 8 |
| Embedding dim | 576 | 1024 |
| Attention heads | 18 | 16 |
| Head dimension | 32 | 64 |
| Context window | 256 | 512 |
| FFN dimension | 2304 | 4096 |
| VRAM usage | N/A (CPU) | ~1.8 GB |

Wide and shallow. Each layer does more work. Fewer layers means faster training.
Head dimension doubled from 32 to 64 — each attention head can now represent
much richer patterns. 512-token context means the model can see longer
conversations during training.

The whole thing fits in 1.8 GB of a 12 GB card. Room to spare.

---

## From OCaml to Nim in One Day

The morning started in OCaml. Vidya's original implementation — hand-rolled
autograd, BPE tokenizer, transformer, training loop — all OCaml calling
OpenBLAS for matrix multiplication on CPU. We ported it to CUDA: wrote GPU
kernels, an OCaml FFI bridge, custom memory blocks with GC finalizers. It
worked. 103M parameters training on the RTX 3060.

But it was painful. OCaml's FFI requires C linkage wrappers. GPU tensors
needed custom blocks with finalizer hacks. The GC would free device memory
mid-computation — we had to force full GC sweeps between training steps to
prevent use-after-free crashes. The build system fought us at every turn:
nvcc compilation rules, duplicate symbol linking, header path mismatches.

The OCaml GPU port was 1,000+ lines across three files: `gpu_stubs.cu`,
`gpu_bridge.c`, `gpu.ml`, plus dune build hacks. It worked, but it was
fragile.

Then we rewrote it in Nim.

Nim compiles to C. CUDA interop is just C function calls — `{.importc,
header.}` and you're done. No bridge file. No custom blocks. No bytecode
wrappers. The entire GPU layer is one 130-line Nim file plus a 280-line
CUDA kernel file. Half the code. No hacks.

The results speak:

| | OCaml + CUDA | Nim + CUDA |
|---|---|---|
| GPU bridge code | ~1,000 lines (3 files) | ~400 lines (2 files) |
| Model init time | ~40 seconds | 1.8 seconds |
| Forward pass (103M) | ~3 seconds/step | 0.15 seconds/step |
| Build system | dune + nvcc rules + link hacks | `nim c` (just works) |
| GC issues | use-after-free, forced GC sweeps | none (deterministic destructors) |
| Compile time | ~10 seconds | 3.5 seconds |

The 20x speedup isn't Nim being faster than OCaml at math — both call the same
cuBLAS. The difference is that Nim's GPU path has no overhead. No OCaml GC
pausing to finalize GPU buffers. No CPU↔GPU round trips for softmax (the OCaml
version fell back to CPU for causal softmax — 32 data transfers per step). No
FFI marshalling cost. Just direct function calls into CUDA.

---

## The Memory Mechanism

This is the experiment the GPU makes possible.

Current LLMs are stateless. Every prompt starts from the same weights. They
don't learn from interaction. Vidya is different. After each conversation,
we run one gradient step through the network. But not a normal gradient step.

**Sparse gradient masking.** Only the top 1% of gradients by magnitude get
through. The other 99% are zeroed. Out of 103 million weights, roughly one
million get updated per interaction — the ones that fired hardest for this
specific input. This is our "frontal cortex" — selective retraining at the
weight level, not the layer level.

**Elastic weight consolidation.** After each update, every weight gets pulled
back toward the base model. Weights that didn't change much snap back. Weights
that consistently fire hard over many interactions resist the pull and
accumulate permanent change.

At 10M parameters, this mechanism could hold about three facts before
catastrophic forgetting wiped them out. We believe the failure was capacity —
not enough weights in the top 1% to encode distinct memories without
interference.

At 103M parameters, the top 1% is over a million weights per interaction.
Ten times more room for memories. Wider layers mean more independent subspaces
where different facts can live without competing. This is the experiment:
does 10x capacity give us 10x memory, or does forgetting scale differently?

---

## The Stack

```
Conversation data (37K dialogues, 25MB)
    ↓
BPE tokenizer (2259 vocab, trained on corpus)
    ↓
Nim (model definition, training loop, tokenizer)
    ↓
CUDA kernels (cuBLAS sgemm, GELU, RMSNorm, softmax, RoPE, Adam)
    ↓
RTX 3060 12GB (103M params in 1.8GB VRAM)
```

No PyTorch. No Python. No NVIDIA proprietary frameworks beyond cuBLAS. The
kernels are ours — every line readable, every operation modifiable. Nim
compiles to C, so the CUDA interop is native. When we swap the RTX 3060 for
a Tenstorrent
[Blackhole](/posts/sovereign-ai-on-open-silicon-why-i-need-a-blackhole/),
the change is one file — replace cuBLAS calls with TT-NN calls.

The rest of the stack doesn't move.

---

## It's Learning

```
step     50 / 200000 | loss 11.1330 | lr 0.000003
step    150 / 200000 | loss 11.0843 | lr 0.000009
step    250 / 200000 | loss 10.7710 | lr 0.000015
step    300 / 200000 | loss 10.5158 | lr 0.000018
```

Loss dropping from 11.1 to 10.5 in 300 steps. The autograd works. The
model is learning. At 13 steps/sec with full forward+backward+Adam, one
epoch takes about 48 minutes.

We hit a gradient explosion at step 350 — the learning rate ramped too
fast for 103M parameters. Fixed with gradient clipping and a more
conservative learning rate. This is normal. This is what training from
scratch looks like — you find the edges, you pull back, you try again.

---

## The Vision

Here's what we're actually building.

You sit at your machine with Claude Code. You say "I want a model that
remembers conversations" or "I want it to know about my codebase" or
"I want it to run on this specific hardware." Claude builds it. Not
wraps a framework — builds the actual model, the training loop, the
inference engine, the memory mechanism. In Nim, compiling to C, calling
your GPU directly.

The end state: a local LLM that you trained on your data, with memory
that persists between conversations, running on hardware you own. Claude
Code is the interface — you describe what you want, it writes the Nim
code, compiles it, trains it, debugs it.

Not a fine-tuned Llama. Not a wrapper around someone else's model. An
LLM built from the tensor operations up, where you control every layer,
every activation function, every training decision. If you want to
change how attention works, you change 20 lines of Nim. If you want a
different memory mechanism, you swap out the gradient masking strategy.

Portable across hardware. Nim compiles to C. Today it calls cuBLAS on
a 3060. Tomorrow it calls TT-NN on a
[Blackhole](/posts/sovereign-ai-on-open-silicon-why-i-need-a-blackhole/).
The model definition doesn't change. You swap one file and point at
different silicon.

That's what we built today. From "no GPU code" to "loss is decreasing
on a 103M parameter transformer" in one session. The skeleton of a
personal AI that you own completely.

---

## What Happens Next

Once the base model converges:

1. Save the base weights as an anchor
2. Run interactive RL sessions — talk to the model, give feedback
3. Measure: how many facts can it hold? How long do they persist?
4. Compare against the 10M results (three facts, then forgetting)

If selective retraining at 103M gives us durable memory — dozens of
stable facts, a persistent personality, graceful forgetting — then we've
answered the question. You don't need a symbolic dictionary or an
external database. You need a big enough network, a smart enough
gradient mask, and the patience to let the weights reorganise.

The model is training. The loss is dropping. We'll know soon.

---

*See also:
[Sovereign AI on Open Silicon](/posts/sovereign-ai-on-open-silicon-why-i-need-a-blackhole/),
[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/),
[Six Ways to Teach Mr. Classic](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/).*

*Co-authored with [Claude](https://claude.ai/).*
