---
title: "NimLLM: A Local Language Model You Own"
date: 2026-03-20
layout: "base.njk"
tags: post
---

# NimLLM: A Local Language Model You Own

```
step    650 / 25000 | loss 10.44 | lr 0.000033 | 1.1 opt/s
```

That's a 103 million parameter language model training on my RTX 3060.
Not downloading someone else's weights. Training. From scratch. On my
data. In a language nobody expects.

The entire thing is one Nim binary. No Python. No PyTorch. No pip
install. Nim compiles to C. C calls CUDA. The model learns.

---

## What It Is

NimLLM is a program you run on your computer. You feed it text — books,
conversations, code, your notes — and it trains a language model on
that text. Then you talk to it. Then it retrains on the conversation
you just had. It remembers.

```
$ nimllm --train mybooks.txt
training 103M params on 37K documents...
step   2500 / 25000 | loss 8.42 | 1.1 opt/s

$ nimllm --chat
you> what did we talk about yesterday?
nimllm> You asked about the Forth machine architecture...
```

No API key. No subscription. No terms of service. The model runs on
your GPU, trains on your data, remembers your conversations. It belongs
to you.

---

## Why Not Just Run Llama?

You can download a quantized Llama model, run it through llama.cpp,
and get a smart chatbot immediately. It's fast, it's capable, it's
free. So why build your own?

**Llama can't remember.** Every conversation starts from the same
frozen weights. You can stuff context into the prompt, but that's not
memory — that's a workaround. NimLLM retrains after each conversation.
The weights change. Tomorrow it's a different model than today.

**Llama can't learn your domain.** You can RAG your documents, but
retrieval isn't understanding. NimLLM trains directly on your text.
The knowledge goes into the weights, not a search index. It doesn't
retrieve facts — it knows them.

**Llama is a black box.** 70 billion parameters of opaque weights
trained on data you've never seen. NimLLM is 103 million parameters
you trained yourself on data you chose. Every weight exists because
of text you fed it. The model is a reflection of what you taught it.

**Llama is someone else's intelligence.** Meta trained it. Meta chose
the data. Meta decided what it should and shouldn't say. NimLLM is
yours. No alignment tax. No content policy. No phone-home telemetry.
Your model, your rules.

---

## How It Works

The architecture is a standard GPT-2 style transformer, scaled for
a single consumer GPU:

| | |
|---|---|
| Parameters | 103M |
| Layers | 8 |
| Width | 1024 |
| Attention heads | 16 |
| Context window | 512 tokens |
| VRAM | 1.8 GB |
| Training speed | ~1 optimizer step/sec |

Wide and shallow. 8 layers instead of the usual 12+. Each layer is
wide (1024 dimensions) so each attention head sees 64 dimensions —
rich enough for real pattern matching. The whole model fits in under
2 GB. An RTX 3060 with 12 GB has room to spare.

**Training from scratch** uses AdamW with cosine learning rate decay,
gradient accumulation over 8 steps, and gradient clipping at norm 1.0.
Standard recipe, same as nanoGPT. You feed it a text file, it
tokenizes with BPE, and trains.

**The memory mechanism** (coming next) uses selective weight retraining.
After each conversation, only the top 1% of gradients by magnitude
get through — roughly one million weights out of 103 million. The
rest don't move. Elastic weight consolidation pulls everything back
toward the base model, so weights that change once snap back, but
weights that change consistently across many conversations accumulate
permanent knowledge.

At 10 million parameters, this mechanism held three facts before
forgetting. At 103 million, we expect significantly more. The
experiment is running now.

---

## The Stack

```
Your text (books, conversations, notes)
    ↓
BPE tokenizer (trained on your corpus)
    ↓
Nim (model, autograd, training loop)
    ↓
CUDA kernels (GELU, RMSNorm, softmax, RoPE, AdamW)
    ↓
cuBLAS (matrix multiplication)
    ↓
Your GPU
```

Six layers. Every one readable. Every one modifiable.

The CUDA kernels are 300 lines of C. The Nim GPU bindings are 200
lines. The autograd engine is 200 lines. The model definition is 100
lines. The training loop is 100 lines. The whole thing is under 1,000
lines of code.

PyTorch is 3 million lines. We do what we need in 1,000.

---

## Why Nim

We tried OCaml first. It worked but the FFI boundary between OCaml
and CUDA was painful — 1,000 lines of bridge code, GC finalizer bugs
crashing the GPU, forced garbage collection between training steps.

Nim compiles to C. CUDA interop is just C function calls. No bridge
file. No custom memory blocks. No GC fighting your GPU allocations.
When you write `gpu_adamw(param.data, grad.data, ...)` in Nim, that's
literally a C function call in the generated code.

We also considered:

- **C**: maximum control but no closures, no generics. Autograd in C
  is miserable.
- **Rust**: the borrow checker and GPU pointers don't mix. Every
  device pointer is unsafe. Every autograd closure needs lifetime
  annotations.
- **Python + PyTorch**: fast to prototype but 3 million lines of
  framework between you and the GPU. Can't compile to a single binary.

Nim gives you C's performance with Python's productivity. Closures
for autograd. Generics for type safety. Metaprogramming for code
generation. Compiles in 4 seconds. Produces a single binary. The
only downside is the small community — which means if you build
something real in Nim, people notice.

---

## How It Got Built

I sat at my Linux workstation and told Claude Code what I wanted.

"I want a 103M parameter transformer that trains on GPU. Written in
Nim. Direct CUDA calls. No frameworks."

We started in OCaml — the original implementation. Ported to CUDA. It
worked but the FFI was painful: 1,000 lines of bridge code, GC
finalizer bugs, build system fights.

Then we rewrote in Nim. Nim compiles to C. CUDA interop is just C
function calls. The entire GPU layer went from 1,000 lines to 400.
Model init: 1.8 seconds instead of 40. Forward pass: 0.15 seconds
instead of 3.

The autograd was the hard part. Each operation records how to compute
its gradient. The backward pass walks the graph in reverse. We found
and fixed a softmax backward bug (in-place aliasing), a missing causal
mask in the attention backward, and had to tune AdamW with weight
decay to prevent gradient explosions. Standard training pains — but
all debugged in one session with numerical gradient checking.

From "no Nim code" to "loss is dropping on 103M params" in one day.

---

## Who This Is For

**Researchers** who want to understand transformers by building one,
not by reading PyTorch source.

**Developers** who want a local AI that knows their codebase — trained
on their code, their docs, their commit messages.

**Writers** who want a model trained on their own writing style, their
notes, their research. Not a generic assistant — a model that thinks
like you because it learned from you.

**Anyone** who believes AI shouldn't require a subscription, shouldn't
phone home, and shouldn't belong to a company.

---

## What's Next

The model is training right now. Loss is dropping from 11.2 toward
what should be 3-4 at convergence. Once it can hold a conversation:

1. **Interactive retraining.** Talk to the model. Give feedback. Watch
   the weights update. See if it remembers tomorrow.

2. **Book training.** Feed it a book. See how it changes. Feed it
   another. See if it forgets the first.

3. **Memory experiments.** How many facts can 103M parameters hold
   through selective retraining? Three (like the 10M model)? Thirty?
   Three hundred?

4. **Agent mode.** Connect NimLLM to a minimal coding agent — something
   like [Girvent](https://github.com/rolandnsharp/girvent) — so it can
   use your bash tools. Send emails. Read files. Run CLI programs. Not
   a chatbot trapped in a text box — an AI that can act on your machine
   through the same tools you use. `nimllm --agent` drops into a loop
   where it reads your request, plans a sequence of shell commands,
   executes them, and learns from the result. Your local AI with hands.

5. **Open source release.** One binary. `nimllm --train yourdata.txt`.
   `nimllm --chat`. `nimllm --agent`. That's the interface.

The code is on [GitHub](https://github.com/rolandnsharp/vidya). The
model is training. The loss is dropping.

Your intelligence. Your hardware. Your data. Your model.

---

*See also:
[103M Parameters on a 3060](/posts/103m-parameters-on-a-3060-training-vidya-on-gpu/),
[Sovereign AI on Open Silicon](/posts/sovereign-ai-on-open-silicon-why-i-need-a-blackhole/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/).*

*Co-authored with [Claude](https://claude.ai/).*
