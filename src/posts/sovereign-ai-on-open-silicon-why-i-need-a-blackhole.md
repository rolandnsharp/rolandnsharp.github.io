---
title: "Sovereign AI on Open Silicon: Why I Need a Blackhole"
date: 2026-03-19
layout: "base.njk"
tags: post
---

# Sovereign AI on Open Silicon: Why I Need a Blackhole

I'm writing this with Claude Code — an AI coding agent running in my terminal. I tell
it what I'm thinking, it helps me build it, and we ship together. That's how Vidya was
built. That's how this post was written. That's how the Blackhole will be programmed.

On my desk there's also a PicoCalc — a pocket calculator with a RISC-V chip, a tiny
keyboard, and a screen the size of a playing card. I'm building a Forth system on it
from scratch. No SDK, no operating system, no internet. Just me and the metal.

The PicoCalc is training. The real work needs real silicon.

The machine I actually want to build needs a
[Tenstorrent Blackhole](/posts/burn-the-stack-llms-without-nvidia/) card — a p150a,
slotted into a Linux workstation I build myself. My own machine, my own monitor, my
own keyboard, Blackhole silicon over PCIe. Start with one card. Learn it deeply. Then
scale to four when the architecture proves out — 128GB of pooled VRAM for under
$6,000. And I don't mean programmed through PyTorch. I mean programmed the way Jim
Keller's team designed it to be — bare metal, open stack, direct access to the Tensix
mesh.

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

**[Forth9](/posts/forth9-the-lisp-forth-machine-that-fits-in-your-pocket/)** — the
vision for a Forth system on the RISC-V PicoCalc. One language, top to bottom. The
OS, the shell, the editor, the compiler — all Forth, built on the device itself. I'm
building it now on the PicoCalc, learning RISC-V from the metal up.

And **[The Forth Machine](/posts/the-forth-machine-a-vision-for-symbolic-ai/)** — a
complete architectural vision for what happens when you put all of this together on
tensor hardware. Dictionary as knowledge graph. Compilation as reasoning. Stack
manipulation as attention. Self-modifying AI that is transparent all the way down.

These aren't separate projects. They're layers of the same system — some built, some
being built, all converging.

---

## What a Blackhole Card Actually Is

Most people look at the Blackhole p150a and see an alternative GPU. A card that does
what an RTX does, but open-source and interconnect-ready.

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

**An AI with memory.** Not a stateless model that forgets everything between
conversations. A system that learns from interaction, remembers what it learned, and
wakes up tomorrow slightly different than it was today. The Forth dictionary is the
memory — every concept the system has ever learned is a word it can recall, inspect,
and build on. New experiences create new words. The dictionary grows. The system
accumulates knowledge the way a person does — not by retraining from scratch, but by
integrating new experience into an existing structure.

We've already built the reinforcement learning methods to make this work. Vidya
trains Mr. Classic through
[six different RL approaches](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/)
— reward shaping, curriculum learning, self-play, hindsight experience replay. These
aren't theoretical. They're implemented, tested, and documented. On a Blackhole, they
run on tensor hardware instead of CPU, and the system learns in real time from every
interaction instead of in batch after the fact.

The [LoRA sleep cycle](/posts/the-forth-machine-a-vision-for-symbolic-ai/) makes the
memory durable. During the day, the system accumulates a lightweight adaptation on top
of its base weights — cheap, fast, non-destructive. At night, it consolidates. Replays
the day's experiences. Merges what it learned into the base. Prunes what didn't matter.
Snapshots to flash. Wakes up the next morning a little more knowledgeable. This is how
neuroscience thinks biological memory works. It's how our AI will work too.

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

## The Development Machine

The Blackhole card goes into a Linux workstation I build myself. Not a headless server
I SSH into — a machine at my desk with a monitor, a keyboard, and a PCIe slot with
a Blackhole in it. I need to sit at this machine and develop on it directly.

That matters because of how I work.

I build with [Claude Code](https://claude.ai/claude-code) — an AI coding assistant
that runs in the terminal on a Linux machine. It reads my codebase, understands the
architecture, helps me write the FFI bridges and the assembly and the tensor
operations. It's how Vidya was built. It's how every post on this blog was written.
It's how this post was written.

The workflow: I sit at my workstation. Claude Code runs in the terminal. The Blackhole
is in the PCIe slot. I'm writing Forth kernels for the Tensix cores, and Claude is
helping me navigate the TT-Metalium SDK, debug RISC-V assembly, design the tensor
dispatch protocol, work through the math of attention mechanisms. When we write a new
tensor word, we test it immediately — the card is right there, in the same machine,
not a cloud instance three SSH hops away.

This is what the next era of programming looks like. Not a human typing alone into a
terminal. Not an AI generating code unsupervised. A human and an AI building something
together on real hardware, iterating in real time, each contributing what they're best
at. I bring the vision, the architecture, the bare-metal instinct. Claude brings the
breadth — every data sheet, every algorithm, every edge case in floating point
arithmetic.

The PicoCalc is where I build alone. The workstation is where I build with AI. Both
matter. The first teaches me what the machine is. The second lets me build what the
machine can become.

A task this ambitious — a new language, a new AI architecture, bare-metal tensor
programming — is exactly the kind of thing that becomes possible when a skilled human
and a capable AI work together on the right hardware. None of the three alone is
sufficient. All three together is something new.

---

## Why This Is Worth It

Right now, AI belongs to five companies. They train the models. They own the weights.
They rent you access by the token. You don't have AI — you have a subscription.

The hardware that makes AI possible is controlled by one company. NVIDIA sells the
chips. CUDA locks in the software. If you want to train a model, you pay the toll.
If you want to understand how the model works, you can't — the weights are
proprietary, the compute stack is proprietary, and the training data is proprietary.
Intelligence as a service, owned by someone else.

This doesn't have to be the future.

A Blackhole card costs $1,400. A workstation to hold four of them costs less than a
used car. 128GB of pooled VRAM, open-source software stack, RISC-V cores you can
program directly. That's not a toy. That's enough to train serious models — hundreds
of millions of parameters, maybe billions with the right architecture.

Now put a Forth system on it. Not PyTorch — something you built, something you
understand, something you can modify. A language that IS the intelligence, where
every concept is a word you can inspect and every reasoning step is a definition you
can read. Transparent all the way down. No black box.

That's not a research curiosity. That's a sovereign AI. Intelligence that belongs to
the person who built it, running on hardware they own, with software they can read.
No API key. No subscription. No terms of service that change next quarter.

**Our people will have compute.**

Not rented from a cloud provider. Not gated behind an enterprise contract. Actual
silicon, on a desk, running code they wrote. A Blackhole card and a Forth system and
the will to build — that's all it takes to own your own intelligence.

The whole point of open hardware and open software is that it compounds. I build the
Forth-on-Tensix kernel and publish it. Someone else builds a tensor algebra library on
top of it. Someone else trains a model with it. Someone else extends the language.
Each person adds a layer. Each layer is open. The system grows because everyone who
touches it makes it better for everyone who comes after.

This is what Tenstorrent's open stack makes possible that NVIDIA's closed stack never
will. Not just cheaper AI — *owned* AI. Intelligence that doesn't phone home.
Compute that doesn't require permission.

The question isn't whether someone will build this. The question is whether
Tenstorrent wants to be part of the story when it happens.

---

## The Path

I'm not asking for a research grant or a partnership or a job. I'm asking for a
Blackhole p150a card.

I have the skills. The architecture is designed. The prerequisite software exists. The
blog has the audience. The AI collaborator is ready. The work is happening regardless
— I'm building Forth on RISC-V right now on a $60 calculator. One Blackhole card
makes it real. Four make it scale.

The PicoCalc proves I can build from nothing. Vidya proves I can build AI from
scratch. The Forth Machine proves I know where this is going. The blog proves I'll
document every step. Claude Code proves I don't have to do it alone.

Give me a Blackhole and I'll show you what it can do.

---

*See also:
[The Forth Machine](/posts/the-forth-machine-a-vision-for-symbolic-ai/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/),
[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Forth9](/posts/forth9-the-lisp-forth-machine-that-fits-in-your-pocket/).*

*Co-authored with [Claude](https://claude.ai/).*
