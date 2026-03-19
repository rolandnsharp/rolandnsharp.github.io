---
title: "103M Parameters on a 3060: Training Vidya on GPU"
date: 2026-03-20
layout: "base.njk"
tags: post
---

# 103M Parameters on a 3060: Training Vidya on GPU

```
nvidia-smi
| NVIDIA GeForce RTX 3060        |   3480MiB / 12288MiB |   28%  |
| _build/default/bin/main.exe                           1756MiB  |
```

That's Vidya — our neurosymbolic language model — training a 103 million
parameter transformer on a single consumer GPU. The entire stack is ours: OCaml
orchestration, CUDA kernels, hand-rolled autograd, no PyTorch, no frameworks.
Built in one session with Claude Code.

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

## The GPU Port

Until today, Vidya trained on CPU. Single-threaded OpenBLAS. At 49M parameters,
one epoch over 37,000 conversations took days. At 103M it would take weeks.
The memory experiments we need to run — hundreds of RL interactions testing
whether the model can accumulate persistent knowledge — were impossible.

So we ported the entire engine to CUDA. In one session. Here's what that means:

**OCaml stays as the orchestrator.** It builds the computation graph, manages the
training loop, handles tokenization and I/O. The autograd backward pass is a
topological sort in OCaml that dispatches to GPU kernels via closures.

**CUDA does the math.** Every tensor operation — matrix multiply, GELU activation,
softmax, RMSNorm, dropout, embedding lookup, Adam optimizer — runs on GPU.
The data lives in VRAM as float32 and never moves to CPU during training except
for a single scalar loss value for logging.

**The FFI bridge is thin.** OCaml custom blocks wrap `cudaMalloc`'d device
pointers. The GC finalizer calls `cudaFree`. Three files connect the two
worlds: `gpu.ml` (OCaml externals), `gpu_bridge.c` (OCaml ↔ C marshalling),
`gpu_stubs.cu` (CUDA kernels and cuBLAS wrappers).

The entire CUDA backend — all kernels, the cuBLAS integration, the memory
management, the OCaml bridge — was written in a single Claude Code session.
I described the architecture. Claude wrote the code. We iterated on build
errors together. From "I have a CPU-only OCaml transformer" to "103M params
training on GPU" in one sitting.

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

We don't know yet. The model is training right now.

---

## The Stack

```
Conversation data (37K dialogues, 25MB)
    ↓
BPE tokenizer (2188 vocab, trained on corpus)
    ↓
OCaml autograd engine (computation graph)
    ↓
CUDA kernels (cuBLAS gemm, custom element-wise ops)
    ↓
RTX 3060 12GB (103M params in 1.8GB VRAM)
```

No PyTorch. No Python. No NVIDIA proprietary frameworks. The operations library
is our code — every kernel readable, every line modifiable. This is what
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/) was building
toward. When we swap the RTX 3060 for a Tenstorrent
[Blackhole](/posts/sovereign-ai-on-open-silicon-why-i-need-a-blackhole/),
the change is one C file — replace cuBLAS calls with TT-NN calls.

The rest of the stack doesn't move.

---

## What Happens Next

The model trains on 37K conversations. This is thin for 103M parameters — we
have hundreds of megabytes of additional conversation data from HuggingFace
ready to convert. But it's enough for the memory experiments.

Once the base model can hold a conversation:

1. Save the base weights as an anchor
2. Run interactive RL sessions — talk to the model, give feedback
3. Measure: how many facts can it hold? How long do they persist?
4. Compare against the 10M results (three facts, then forgetting)

If selective retraining at 103M gives us durable memory — dozens of stable
facts, a persistent personality, graceful forgetting — then we've answered
the question. You don't need a symbolic dictionary or an external database.
You need a big enough network, a smart enough gradient mask, and the patience
to let the weights reorganise.

And if it doesn't work, we still have the
[Forth Machine](/posts/the-forth-machine-a-vision-for-symbolic-ai/) in our
back pocket. The symbolic dictionary is implementable in OCaml whenever we
need it.

But I think it'll work. The biology says it should — brains do exactly this
with synaptic plasticity and sleep consolidation. We're just doing it with
gradient masking and elastic pull.

The model is training. We'll know soon.

---

*See also:
[Sovereign AI on Open Silicon](/posts/sovereign-ai-on-open-silicon-why-i-need-a-blackhole/),
[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/),
[Six Ways to Teach Mr. Classic](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/).*

*Co-authored with [Claude](https://claude.ai/).*
