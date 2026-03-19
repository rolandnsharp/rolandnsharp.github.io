---
title: "Give Me a Blackhole and I'll Show You What It Can Do"
date: 2026-03-19
layout: "base.njk"
tags: post
---

# Give Me a Blackhole and I'll Show You What It Can Do

I'm writing this from a PicoCalc — a pocket calculator with a RISC-V chip, a tiny
keyboard, and a screen the size of a playing card. I'm building a Forth system on it
from scratch. No SDK, no operating system, no internet. Just me and the metal.

This is not a hobby. This is training.

The machine I actually want to build needs a
[Tenstorrent Blackhole](/posts/burn-the-stack-llms-without-nvidia/). Specifically, a
QuietBox TT — the desktop workstation with Blackhole cards sitting right there on
your desk, silent, waiting to be programmed. And I don't mean programmed through
PyTorch. I mean programmed the way Jim Keller's team designed it to be — bare metal,
open stack, direct access to the Tensix mesh.

I've spent the last several months building the tools and the understanding to do
exactly that. Here's what I have, what I'm building, and what I'll do with a
Blackhole that nobody else will.

---

## What I've Already Built

**[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/)** — a
neurosymbolic language model written from scratch in OCaml. No PyTorch. No Python.
Hand-rolled autograd, hand-rolled transformer, hand-rolled BPE tokenizer. The entire
model is one binary that calls OpenBLAS for matrix multiplication and nothing else.

**[Mr. Classic](/posts/growing-mr-classic-from-10m-to-50m/)** — a chatbot trained on
2.4 million conversations using Vidya's framework. 49 million parameters. Trained with
[reinforcement learning](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/)
from the foundations up.

**[Forth9](/posts/forth9-the-lisp-forth-machine-that-fits-in-your-pocket/)** — a
Forth system for the RISC-V PicoCalc. One language, top to bottom. The OS, the shell,
the editor, the compiler — all Forth, all built on the device itself.

And **[The Forth Machine](/posts/the-forth-machine-a-vision-for-symbolic-ai/)** — a
complete architectural vision for what happens when you put all of this together on
tensor hardware. Dictionary as knowledge graph. Compilation as reasoning. Stack
manipulation as attention. Self-modifying AI that is transparent all the way down.

These aren't separate projects. They're layers of the same system.

---

## What the QuietBox TT Actually Is

Most people look at the QuietBox TT and see a workstation for running LLM inference.
A box that does what an NVIDIA DGX does, but cheaper and quieter.

That's the least interesting thing about it.

Each Blackhole card has 140 Tensix cores. Each Tensix core has its own RISC-V
processor. That RISC-V processor can run arbitrary code — not just predefined kernels,
not just scheduled operations from a framework, but actual programs. Your programs.

The Tensix SFPU (Special Function Processing Unit) gives you hardware-accelerated
math:

```
multiply    accumulate    sigmoid    tanh    exp    sqrt
```

These are the atomic operations of neural networks. Every transformer is built from
compositions of these six things. On NVIDIA hardware, you access them through five
layers of proprietary abstraction. On Blackhole, they're instructions. You write them
directly.

The Network-on-Chip connects all 140 cores into a mesh. Data flows between cores
without going through main memory. One core's output is another core's input. The
topology is a 2D grid — not a bus, not a ring, a mesh where every core can talk to
its neighbours and route data across the chip.

And then the QSFP-DD ports connect multiple cards together. Same paradigm at every
scale: core-to-core inside a chip, chip-to-chip across cards, card-to-card across a
rack. The entire system is a single programmable fabric.

This is not a GPU. It is a computer made of computers.

---

## What I Want to Build on It

A Forth system that spans the entire machine.

The host CPU runs the REPL, the dictionary, the symbolic reasoning. You type words.
The system parses them, looks them up, executes them. When a word needs tensor
computation, it dispatches to the Blackhole mesh transparently. When the mesh returns
a result, it lands on the stack like any other value.

```
1024 1024 MATRIX A
1024 1024 MATRIX B
A B MATMUL .
```

You don't care that `MATMUL` just coordinated 140 cores across a mesh network. The
word handles dispatch. The stack handles data flow. Forth handles the rest.

But it goes deeper than convenience. The real vision:

**Words as neurons.** Every concept in the system is a Forth word with both symbolic
structure (its definition in terms of other words) and tensor data (an embedding
computed on the mesh). The dictionary IS the neural network's knowledge representation.
Not a weight matrix that you need interpretability tools to understand — actual named,
inspectable, composable concepts.

**Compilation as learning.** When the system encounters something new, it doesn't
adjust weights in a fixed graph. It creates a new word. It defines it in terms of
existing words. It computes an embedding. The vocabulary grows. The next time it
encounters that concept, it knows it — because it's in the dictionary.

**Tensor equations as interaction.** The neural network isn't a black box that
produces text. It's a set of tensor operations — attention, projection, activation —
expressed as Forth words, composable, inspectable, modifiable at runtime. You can
redefine how attention works while the system is running. Try that with PyTorch.

---

## Why Me

Every AI researcher in the world can pip install pytorch and fine-tune a model on
NVIDIA hardware. That is not a differentiating skill. What's rare is the combination:

**I write AI frameworks from scratch.** Vidya's autograd engine, transformer, and
training loop are hand-written OCaml. Not wrapped around a framework — written. I
understand backpropagation because I implemented it. I understand attention because I
wrote the matrix operations. When something breaks, I don't search Stack Overflow. I
read my own code.

**I write on bare metal.** Forth9 runs on RISC-V with no OS. I'm building it on the
device itself, from the hardware up. The same RISC-V ISA runs on Blackhole's Tensix
cores. The skills transfer directly — register-level programming, memory management,
interrupt handling, all in Forth.

**I build in public.** Every step of this work is documented on this blog. The code,
the architecture, the failures, the pivots. When I say I'll do something with a
Blackhole, you can read the last six months of posts and judge whether that's credible.

**I have an architecture that's ready.** The Forth Machine post isn't a wish list —
it's a complete design. Five layers from host CPU to symbolic AI, with specific data
structures, memory hierarchies, and learning algorithms. A LoRA-based sleep cycle. A
bicameral dialogue system. Dynamic architecture through Forth metaprogramming. This
isn't "give me hardware and I'll figure something out." This is "give me hardware and
I'll execute a plan."

**My stack is designed for Tenstorrent.** Vidya's entire hardware interface is one
function call. One. Swap OpenBLAS for TT-NN and the port is done. No CUDA
dependencies to untangle. No framework assumptions to work around. We built clean
specifically so this moment would be easy.

---

## What I'll Produce

Concrete deliverables, not vague research:

**1. Forth-on-Tensix.** A Forth kernel running directly on Blackhole's RISC-V cores.
Not through TT-Metalium — on the metal. Each Tensix core running a Forth interpreter
with access to the SFPU instruction set. Published open source with documentation.

**2. Tensor words.** A Forth vocabulary for tensor operations — `MATMUL`, `SOFTMAX`,
`LAYERNORM`, `ATTENTION` — that coordinate the mesh automatically. The first
open-source, bare-metal, interactive tensor programming environment for Blackhole.

**3. Vidya on Blackhole.** The existing OCaml framework ported to TT-NN. Mr. Classic
training on Tenstorrent silicon. Benchmarks, training curves, comparison with CPU
baseline. Proof that you can train real models on this hardware without PyTorch.

**4. A neurosymbolic prototype.** The Forth Machine architecture running live —
dictionary as knowledge graph, tensor operations as Forth words, symbolic reasoning
integrated with neural inference. The first system where you can type a concept into a
REPL and watch it propagate through both a dictionary and a neural network
simultaneously.

**5. Documentation.** Blog posts for every step. Not marketing copy — the real
engineering story. What worked, what didn't, what the hardware can actually do when
someone programs it directly instead of through seventeen layers of abstraction.

---

## The Pitch

Tenstorrent's value proposition is that their hardware is open and programmable. Their
marketing says: this is not a black box, this is a computer you can understand and
control.

Most of your customers will use TT-Metalium and PyTorch and never touch the Tensix
cores directly. They'll use Blackhole as a faster, cheaper GPU. That's fine. That pays
the bills.

But someone needs to show what the hardware can do when you actually take the lid off.
Someone needs to build something on Blackhole that couldn't exist on NVIDIA — not
because of performance, but because CUDA's closed stack makes it impossible. Something
that requires bare-metal access to the mesh, direct programming of the RISC-V cores,
runtime modification of the compute graph.

A self-modifying, self-extending AI system built in Forth on bare-metal Tenstorrent
silicon is that something. It is architecturally impossible on NVIDIA hardware. Not
difficult — impossible. You cannot run arbitrary code on individual CUDA cores. You
cannot modify the compute graph at runtime from the device itself. You cannot build an
interactive REPL that talks directly to the tensor units.

On Blackhole, you can. That's the selling point. I'm the demo.

---

## The Path

I'm not asking for a research grant or a partnership or a job. I'm asking for a
QuietBox TT at my desk.

I have the skills. The architecture is designed. The prerequisite software exists. The
blog has the audience. The work is happening regardless — I'm building Forth on RISC-V
right now on a $60 calculator. A Blackhole just makes it real at scale.

The PicoCalc proves I can build from nothing. Vidya proves I can build AI from
scratch. The Forth Machine proves I know where this is going. The blog proves I'll
document every step.

Give me a Blackhole and I'll show you what it can do.

---

*See also:
[The Forth Machine](/posts/the-forth-machine-a-vision-for-symbolic-ai/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/),
[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Forth9](/posts/forth9-the-lisp-forth-machine-that-fits-in-your-pocket/).*

*Co-authored with [Claude](https://claude.ai/).*
