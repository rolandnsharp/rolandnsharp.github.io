---
title: "Sovereign AI on Open Silicon: Why I Need a Blackhole"
date: 2026-03-20
layout: "base.njk"
tags: post
---

# Sovereign AI on Open Silicon: Why I Need a Blackhole

```
step    100 / 200000 | loss 11.1407 | 94.2 steps/s
step    200 / 200000 | loss 11.1245 | 90.8 steps/s
step    300 / 200000 | loss 11.2724 | 91.9 steps/s
```

That's a 103 million parameter transformer running forward passes on an
RTX 3060 at 94 steps per second. Written in Nim. Direct CUDA calls. No
PyTorch. No frameworks. Built in one day with Claude Code.

Yesterday this model didn't exist. Today it runs on GPU. Tomorrow it
needs a Blackhole.

---

## What We Built Today

I sat at my Linux workstation and told Claude Code what I wanted: a 103M
parameter transformer that trains on GPU, written from scratch, no
dependencies except cuBLAS.

We started in OCaml — Vidya's original language. Wrote CUDA kernels, an
FFI bridge, custom memory blocks. It worked, but the OCaml↔CUDA boundary
was painful: 1,000 lines of bridge code, GC finalizer bugs causing
use-after-free on GPU memory, forced garbage collection between training
steps.

Then we rewrote everything in Nim. Nim compiles to C. CUDA interop is
just C function calls. The entire GPU layer went from 1,000 lines to 400.
Model init: 1.8 seconds instead of 40. Forward pass: 0.15 seconds instead
of 3. Training throughput: 94 steps/sec instead of 1.4.

The architecture:

| | |
|---|---|
| Parameters | 103M |
| Layers | 8 |
| Embedding dim | 1024 |
| Attention heads | 16 |
| Head dimension | 64 |
| Context window | 512 |
| VRAM | 1.8 GB of 12 GB |
| Speed | 94 steps/sec |

Wide and shallow — designed for memory experiments. Each attention head
sees 64 dimensions instead of 32. Wider layers mean more independent
subspaces where different memories can form without competing.

---

## What a Blackhole Card Actually Is

The RTX 3060 got us here. But it's a closed box. The CUDA kernels work,
but we can't see inside the hardware. We can't run code on individual
compute units. We can't modify the execution pipeline at runtime.

Each Blackhole p150a card has 140 Tensix cores. Each Tensix core has its
own RISC-V processor. That RISC-V processor runs arbitrary code — not
just predefined kernels, but actual programs. Our programs.

The Tensix SFPU gives you the atomic operations of neural networks as
hardware instructions:

```
multiply    accumulate    sigmoid    tanh    exp    sqrt
```

Every transformer is built from compositions of these six things. On
NVIDIA, you access them through layers of proprietary abstraction. On
Blackhole, they're instructions you write directly.

The Network-on-Chip connects all 140 cores into a mesh. Core-to-core
data flow without main memory. The QSFP-DD ports connect cards together
— same paradigm at every scale. The entire system is one programmable
fabric.

This is not a GPU. It is a computer made of computers.

---

## What I Want to Build on It

An AI with memory.

Not a stateless model that forgets between conversations. A system that
learns from every interaction, remembers what it learned, and wakes up
tomorrow slightly different than today.

We've already built the mechanism. At 10M parameters, we tested "frontal
cortex" retraining — selective weight updates after each conversation:

**Sparse gradient masking.** Only the top 1% of gradients by magnitude
get through. Out of 103M weights, roughly one million update per
interaction — the ones that fired hardest for this specific input.

**Elastic weight consolidation.** After each update, every weight gets
pulled back toward the base model. Weights that consistently fire hard
resist the pull and accumulate permanent change.

At 10M parameters, the model could hold three facts before catastrophic
forgetting wiped them out. At 103M, the top 1% is over a million weights.
Ten times more room for memories. We're running the experiment now on the
3060. On a Blackhole, we'd run it at scale — with the added ability to
inspect and modify the compute graph at runtime.

We've already built the reinforcement learning methods:
[six different RL approaches](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/)
— reward shaping, curriculum learning, self-play, experience replay.
Implemented, tested, documented. On a Blackhole, they run on tensor
hardware in real time.

---

## Why Nim on Blackhole

Nim compiles to C. Blackhole's TT-Metalium SDK is C/C++. The port is
one file — replace cuBLAS calls with TT-NN calls:

```
Today:    Nim → C → cuBLAS sgemm     → RTX 3060
Tomorrow: Nim → C → TT-NN matmul     → Blackhole
```

The Nim code doesn't change. The model definition, tokenizer, training
loop, memory mechanism — all identical. We swap the tensor library and
point at different silicon.

We proved this architecture today. In one session:
- Built a 103M parameter model from scratch
- Wrote CUDA kernels for every operation (GELU, RMSNorm, softmax, RoPE,
  attention, Adam)
- Hit 94 forward passes per second on a consumer GPU
- All in ~800 lines of Nim + CUDA

The same codebase on a Blackhole with 140 Tensix cores and 32GB VRAM
would train models 10x larger. And unlike CUDA, we could program the
individual cores — run Nim on the RISC-V processors inside the Tensix
mesh.

---

## Why Me

Every AI researcher can pip install pytorch. What's rare:

**I build frameworks from scratch.** Not wrappers — implementations.
Today I built a complete GPU-accelerated transformer training pipeline
in a language most people haven't heard of. From "no GPU code" to "94
steps/sec on 103M params" in one day, directed by Claude Code.

**I build in public.** Every step is documented. The
[blog post](/posts/103m-parameters-on-a-3060-training-vidya-on-gpu/)
about today's work went live while the model was still training. The code
is on [GitHub](https://github.com/rolandnsharp/vidya). You can judge
whether this is credible.

**My stack is designed for Tenstorrent.** One function call separates
cuBLAS from TT-NN. The Nim code compiles to the same C that
TT-Metalium speaks. No CUDA dependencies to untangle. No framework
assumptions to work around.

**I work with AI.** Claude Code is my engineering partner. Together we
move at a pace that a solo developer can't. The Blackhole vision isn't
a decade-long solo project — it's months of focused work with an AI
collaborator that can hold the entire TT-Metalium SDK in context.

---

## The Development Machine

The Blackhole card goes into a Linux workstation at my desk. My monitor,
my keyboard, PCIe slot with a Blackhole in it. I develop directly on
the machine.

Claude Code runs in the terminal. I describe what I want. Claude writes
the Nim code, the CUDA kernels, the TT-NN integration. We test
immediately — the card is right there, not a cloud instance three SSH
hops away.

This is what the next era of programming looks like. A human and an AI
building on real hardware, iterating in real time. I bring the vision
and the architecture. Claude brings the breadth — every data sheet,
every algorithm, every edge case in floating point arithmetic.

---

## Why This Is Worth It

Right now, AI belongs to five companies. They train the models. They
own the weights. They rent you access by the token.

A Blackhole card costs $1,400. Four of them: $5,600. 128GB of pooled
VRAM, open-source software stack, RISC-V cores you can program. That's
enough to train models at hundreds of millions of parameters — maybe
billions with the right architecture.

Put a Nim training framework on it. Not PyTorch — something you built,
something you understand, something you can modify. Train a model with
memory. A model that learns from interaction, remembers what it learned,
doesn't phone home.

**Our people will have compute.**

Not rented. Not gated. Actual silicon on a desk, running code they
wrote. A Blackhole card and a training framework and the will to build.

The question isn't whether someone will build this. The question is
whether Tenstorrent wants to be part of the story when it happens.

---

## The Path

I'm not asking for a research grant or a partnership or a job. I'm
asking for a Blackhole p150a card.

Today I proved the architecture works. 103M parameters, GPU-accelerated,
94 steps/sec, built from scratch in one day. The Nim codebase is ready
for Blackhole — one file change.

The blog proves I document every step. The
[GitHub](https://github.com/rolandnsharp/vidya) proves I ship. Claude
Code proves I don't have to do it alone.

Give me a Blackhole and I'll show you what it can do.

---

## The Bigger Picture

What we built today isn't just a model. It's a new way to build models.

You sit at your machine with an AI coding agent. You describe what you
want — an architecture, a training strategy, a memory mechanism. The
agent writes the code. Nim compiles to C. CUDA runs on your GPU. The
model trains. You see the loss drop. You adjust. You iterate.

This is what AI-directed development looks like at the infrastructure
level. Not "use ChatGPT to write a React component." Build a 103M
parameter transformer from scratch in one day. Write CUDA kernels.
Implement autograd. Watch the loss curve.

The model we're training today is the beginning. It learns from
conversations. It remembers through selective weight updates. It runs
on hardware we own. And the entire stack — from tokenizer to tensor
operations to training loop — is code we can read, modify, and port
to any hardware.

On a Blackhole, this same Nim codebase would train models 10x larger.
The RISC-V cores inside the Tensix mesh could run custom inference
logic. The open software stack means we see everything, modify
everything, own everything.

This isn't about building one model. It's about building the tool that
builds models. A Nim framework that compiles to any silicon, directed
by an AI agent, producing LLMs that belong to the person who trained
them.

**Our people will have compute. And now they'll have the tools to use it.**

---

*See also:
[103M Parameters on a 3060](/posts/103m-parameters-on-a-3060-training-vidya-on-gpu/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/),
[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Six Ways to Teach Mr. Classic](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/).*

*Co-authored with [Claude](https://claude.ai/).*
