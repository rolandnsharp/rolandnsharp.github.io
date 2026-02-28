---
title: "Burn the Stack: Training AI on Open Silicon"
date: 2026-02-28
layout: "base.njk"
tags: post
---

# Burn the Stack: Training AI on Open Silicon

We've been [training a language model from scratch](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/)
in OCaml. No PyTorch, no Python, no frameworks. Hand-rolled autograd, hand-rolled
transformer, hand-rolled BPE tokenizer. The whole model is one binary that talks to OpenBLAS
for matrix multiplies and nothing else.

We did this because we wanted to understand every layer. But it had a side effect we didn't
expect: it made us see how little of the standard AI stack is actually necessary.

---

## The CUDA Tax

When we [grew Mr. Classic to 49 million parameters](/posts/growing-mr-classic-from-10m-to-50m/)
and pointed him at [2.4 million conversations](/posts/feeding-mr-classic-2m-conversations-and-two-fixes/),
we hit a wall. Training on CPU takes 60 days per epoch. We needed a GPU.

So we went shopping. Here's what we found:

| Card | VRAM | Price | Can pool VRAM? | Software |
|------|------|-------|---------------|----------|
| RTX 3060 12GB | 12GB | AU $442 (used) | No | CUDA (proprietary) |
| RTX 5090 | 32GB | AU $5,500 | No | CUDA (proprietary) |
| 2x RTX 5090 | 32GB each | AU $11,000 | No — NVLink removed | CUDA (proprietary) |
| H100 (datacenter) | 80GB | ~$30,000 USD | Yes, with NVLink | CUDA (proprietary) |

Notice the pattern. NVIDIA makes the hardware that can pool VRAM across cards — the
feature that actually lets you scale — but reserves it for the $30,000 tier. Consumer cards
had NVLink on the RTX 3090 (2020), and then NVIDIA killed it. Two 5090s sitting next to
each other can't share memory. You're locked to 32GB per card, no matter how many you buy.

This isn't a technical limitation. It's a business decision. NVIDIA wants a hard boundary
between the $2,000 consumer tier and the $30,000 enterprise tier. The silicon can do it.
The software says no.

And all of it — consumer and enterprise — runs on CUDA. Proprietary. Closed source. Every
kernel, every driver call, every optimisation is a black box you're not allowed to see.

We're building an open-source AI framework from scratch. Locking it into a proprietary
compute stack defeats the point.

---

## The CUDA Moat Is Made of Software

When people say "you can't train AI without NVIDIA," they're not talking about the
hardware. An H100 is a remarkable chip, but the concept is straightforward: take numbers,
multiply them in parallel, move results somewhere useful. AMD can do that. Tenstorrent
can do that. Intel can do that. What locks you into NVIDIA is CUDA — the proprietary
software layer between your code and the silicon.

CUDA isn't one thing. It's a stack of proprietary libraries, each solving a real problem
and each adding another link in the chain: cuBLAS for linear algebra, cuDNN for neural
network primitives, NCCL for multi-GPU communication, TensorRT for inference optimisation.
Then PyTorch wraps all of that. Then your training script wraps PyTorch. Then your
orchestration layer wraps your training script.

Eighteen years of this has created an ecosystem where almost every AI tutorial, every
paper's reference implementation, every deployment guide assumes CUDA. The moat isn't
performance — it's habit. It's the ten thousand Stack Overflow answers that start with
`import torch`. It's the fact that when something breaks at 3am, there's a CUDA-specific
fix on the first page of Google and nothing for the alternatives.

This is what makes NVIDIA's position look unassailable. Not the silicon. The software
ecosystem. An entire industry's muscle memory.

**But the moat only works if you're already inside it.**

The CUDA ecosystem locks in projects that depend on it — PyTorch, TensorFlow, every
framework built on cuBLAS and cuDNN. Porting those projects away from CUDA is a massive
undertaking because they're entangled with proprietary libraries at every level.

We never stepped inside the moat. Vidya doesn't use CUDA. It doesn't use PyTorch. It
calls OpenBLAS for matrix multiplication through a single C FFI function. That's the
entire hardware dependency. There's nothing to port away from CUDA because we never
used CUDA.

And the work of writing optimized kernels for alternative hardware? That's already being
done. Tenstorrent ships TT-NN — an open-source operations library with matmul, softmax,
layernorm, attention. The kernels exist. We just call them, the same way we call OpenBLAS
today.

The CUDA moat is real for the industry. It's irrelevant for us. When you build from
scratch, you get to choose which ecosystem you walk into. We're choosing the open one.

---

## The Alternative Exists

Tenstorrent is Jim Keller's company. (If you don't know the name: he designed the AMD K8,
Apple's A-series chips, AMD Zen, and Tesla's autopilot chip. He's arguably the most
important chip architect alive.) Tenstorrent makes AI accelerators with a fully open-source
software stack.

Their latest card, the Blackhole p150a:

| | Blackhole p150a | RTX 5090 |
|---|---|---|
| VRAM | 32GB GDDR6 | 32GB GDDR7 |
| Compute cores | 140 Tensix + 16 Big RISC-V | 21,760 CUDA cores |
| Interconnect | 4x QSFP-DD 800G | None |
| Multi-card pooling | Yes | No |
| Software | Fully open source | CUDA (proprietary) |
| Price | **$1,399 USD** | ~$2,200 USD |

Read that again. $1,399 for 32GB with open-source everything and multi-card interconnect.

Two Blackhole p150as: 64GB pooled VRAM for $2,800. Four of them: 128GB for $5,600. That's
more VRAM than an H100, pooled across cards, for a fifth of the price. No enterprise
contract. No minimum order. No NVLink paywall.

The interconnect is 4x 800 Gbps — not a proprietary bus, but standard high-speed networking.
Cards mesh together into a single compute fabric. The same communication paradigm that works
core-to-core inside a chip works chip-to-chip across cards and rack-to-rack across servers.

---

## The Simplest Port Possible

Here's the part that surprised us. We'd been thinking about writing custom kernels — maybe
in Forth, maybe in C. Then we looked at what Tenstorrent actually ships.

TT-Metalium, their open-source SDK, includes **TT-NN** — a neural network operations
library with pre-written, optimized kernels for matmul, softmax, layernorm, attention. The
exact operations Vidya needs. Someone at Tenstorrent already wrote and optimized them.

Vidya's entire hardware interface today is one function: a C FFI call to OpenBLAS's `dgemm`
for matrix multiplication. That's it. The port to Blackhole is swapping which library that
one function calls:

```
Today:    OCaml → C FFI → OpenBLAS dgemm    → CPU
Tomorrow: OCaml → C FFI → TT-NN matmul      → Blackhole
```

Same pattern. Same FFI bridge. Different library on the other end. The OCaml code — the
model, the autograd engine, the training loop, the tokenizer — doesn't change. We don't
need to write kernels. We don't need a new language. We call optimized operations that
already exist, the same way we've been calling OpenBLAS.

This is the advantage of building from scratch with a clean architecture. When your entire
hardware dependency is one function, switching hardware is one function change.

---

## The Money

Here's the practical path from where we are to where we want to be:

**Phase 1: Now (AU $442)**
One used RTX 3060 12GB from eBay. Build the CUDA backend for Vidya, prove the GPU training
pipeline works, train Mr. Classic properly. Learn what we need from GPU compute.

**Phase 2: Blackhole ($1,399 USD / ~AU $2,200)**
One Tenstorrent Blackhole p150a. Swap Vidya's BLAS calls for TT-NN calls.
32GB VRAM, open-source stack, interconnect ready for scaling.

**Phase 3: Scale ($2,800-$5,600 USD)**
Two to four Blackholes linked together. 64-128GB pooled VRAM. Train models at 500M to
multi-billion parameters. Put the nodes in a colocation rack, rent spare compute on the
open market when we're not using them.

Compare this to the NVIDIA path:

| Goal | NVIDIA cost | Tenstorrent cost |
|------|------------|-----------------|
| 32GB, single card | $2,200 (5090) | $1,399 (p150a) |
| 64GB, pooled | Impossible on consumer | $2,800 (2x p150a) |
| 128GB, pooled | $60,000+ (H100 nodes) | $5,600 (4x p150a) |

The economics are not close. And the Tenstorrent path keeps everything open — we can see
the software, modify it, contribute back, build on it. The NVIDIA path means every layer
below our code is a black box we're renting access to.

---

## The Full Stack, Open

This is what Vidya's stack looks like today:

```
OCaml (model, autograd, training)  ← open source
  ↓
C FFI bridge                       ← open source
  ↓
OpenBLAS dgemm                     ← open source
  ↓
CPU                                ← commodity hardware
```

Open top to bottom. Every line of code visible, modifiable, ours.

The CUDA path would make it:

```
OCaml (model, autograd, training)  ← open source
  ↓
C FFI bridge                       ← open source
  ↓
CUDA kernels                       ← PROPRIETARY
  ↓
CUDA driver                        ← PROPRIETARY
  ↓
NVIDIA GPU                         ← locked hardware
```

Two proprietary layers in the middle. Can't see them, can't modify them, can't redistribute
them. If NVIDIA changes their licensing, raises prices, or drops support for your card, your
project breaks and you have no recourse.

The Tenstorrent path:

```
OCaml (model, autograd, training)  ← open source
  ↓
C FFI bridge                       ← open source
  ↓
TT-NN (matmul, softmax, etc.)     ← open source
  ↓
TT-Metalium runtime               ← open source
  ↓
Tenstorrent Blackhole              ← open hardware spec
```

Open all the way down. The operations library is open. The runtime is open. The hardware
documentation is public. If Tenstorrent disappeared tomorrow, the community could still
build on the work.

This matters because Vidya isn't a product — it's a research project that we're building in
public. Every post on this blog shows the code, explains the decisions, documents the
failures. Locking the compute layer into a proprietary stack would be a contradiction.

---

## What We're Not Saying

We're not saying CUDA is bad. It's extraordinary engineering with 18 years of optimisation
behind it. cuBLAS GEMM is a work of art. The ecosystem is vast and mature.

We're not saying Tenstorrent will beat NVIDIA on raw performance. It probably won't, at
least not yet. Our individual matrix multiplies might be 80% as fast.

We're not saying everyone should abandon NVIDIA. If you're a company shipping a product,
CUDA is the safe choice.

What we're saying is: we're an independent researcher building an AI framework from first
principles, in public, as an open-source project. The compute layer should match the rest
of the stack — open, visible, ours. Tenstorrent makes that possible at a price we can
afford. NVIDIA doesn't.

---

## The Beautiful Recursion

There's an irony here worth noting. We're currently using Claude — an AI running on NVIDIA
hardware — to help write the software that will let our AI models run without NVIDIA
hardware. Claude Code reads the TT-Metalium SDK, understands the hardware abstraction, and
helps write the FFI bridge to TT-NN operations.

The CUDA ecosystem's last contribution to our project will be building the tool that makes
itself unnecessary.

---

## The Machine We Want to Build

A Tenstorrent Blackhole card running Vidya — the same OCaml framework we've been building
from day one. The same autograd engine, the same transformer, the same training loop. Just
pointing at different silicon through a different library call.

No proprietary layers. No black boxes. No vendor lock-in. Every line of code from the model
definition down to the hardware operation library is open source, readable, modifiable.

The AI revolution has been building computers that think for us. What we want is a computer
that thinks *with* us — transparently, on open hardware, with nothing hidden.

OCaml for the model. TT-NN for the math. Open silicon underneath. That's the stack.

Everything else is kindling.

---

*See also: [Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Growing Mr. Classic](/posts/growing-mr-classic-from-10m-to-50m/),
[Feeding Mr. Classic](/posts/feeding-mr-classic-2m-conversations-and-two-fixes/).*

*Co-authored with [Claude](https://claude.ai/).*
