---
title: "Growing Mr . Classic from 10M to 50M Parameters"
date: 2026-02-28
layout: "base.njk"
tags: post
draft: false
---

# Growing Mr . Classic from 10M to 50M Parameters

In the [last post](/posts/mr-classic-learns-to-read/), we hit a wall. Mr . Classic
at 10 million parameters could hold about three things in his head: his name, his
love of smoking, and basic greetings. Ask him anything else and the answers fell
apart. We tried books, RL, experience replay. The model was full.

So we made him bigger. Not by retraining from scratch — that takes days to weeks on CPU —
but by widening his brain and keeping everything he already knew.

---

## The Problem with Starting Over

Training Mr . Classic at 10M took over 20 hours on a CPU. At 49M parameters,
each training step is about 7x slower — a full training run from scratch would
take over a week. No GPU, no cloud, just a desktop machine grinding through
matrix multiplies.

We weren't going to wait a week. We needed a way to grow the model without
losing what it had learned — like giving someone a bigger brain without erasing
their memories.

---

## Weight Expansion: Making the Brain Wider

The idea is simple. A transformer's knowledge lives in weight matrices. If the
model has 256-dimensional embeddings, every weight matrix has 256 columns. To go
bigger, you make the matrices wider and fill the new columns with zeros.

```
Old wte: [2188 tokens x 256 dims]  →  New wte: [2188 tokens x 576 dims]
         ┌────────────┐                        ┌────────────┬─────────┐
         │ old learned │                        │ old learned │  zeros  │
         │   weights   │                        │   weights   │ (noise) │
         └────────────┘                        └────────────┴─────────┘
```

The old knowledge sits in the top-left block, untouched. The new dimensions start
at zero (or small random noise for embeddings) and learn during continued training.
The model's output is initially almost identical to before — the new dimensions
contribute nothing until they're trained.

We built an `--expand-from` flag into Vidya that does this automatically. Read
the old checkpoint, allocate bigger arrays, blit the old data in, save. Takes
about 3 seconds.

---

## The Growth Stages

We didn't jump straight to 50M. We went in stages, testing at each step:

### Stage 1: 10M → 15.5M (256 dim, 8 heads → 320 dim, 10 heads)

The first expansion. Mr . Classic still knew his name immediately:

```
> who are you?
  I am Mr . Classic .
```

But the new dimensions were noisy. He'd mix in random words where the new
columns were producing garbage. We gave him books and RL sessions to start
filling in the gaps.

### Stage 2: 15.5M → 22M (320 dim, 10 heads → 384 dim, 12 heads)

We realised we were going to need to warm up the new dimensions anyway, so
expanding twice meant doing the warmup twice. We pushed to 22M and started
the warmup cycle: burst of base corpus training, personality book, RL test.

### Stage 3: 22M → 49M (384 dim, 12 heads → 576 dim, 18 heads)

Same logic. If we're warming up, warm up once at the target size. 576
dimensions, 18 heads, same 12 layers. 49 million parameters — nearly 5x
where we started.

### Why wider and not deeper?

Research on small models like SmolLM2 suggests that depth beats width —
more layers with narrower dimensions outperforms fewer layers with wider
dimensions at the same parameter count. SmolLM2's 135M model uses 30
layers at 576 dimensions, which is extremely deep for its size.

We went wide anyway. Adding new layers means adding completely random
weight matrices with no learned knowledge at all. Widening existing layers
preserves every learned weight — the old knowledge sits in the top-left
block of each matrix, untouched. New columns start at zero and learn
gradually.

Going deeper would have meant the model suddenly has random layers in the
middle of its network producing garbage, and there is no clean way to
expand into that. Going wider is a smooth transition — the model works
almost identically to before on day one, and improves as the new
dimensions warm up.

We'll go deeper eventually. But for now, preserving Mr . Classic's hard-won
knowledge matters more than optimal geometry.

---

## The Warmup Problem

Expanding is instant. Training the new dimensions is not.

After expansion, Mr . Classic's old 256 dimensions still work perfectly —
they carry all his learned English, his name, his smoking habit. But the
new 320 dimensions (256→576) are dead weight. They produce noise that
mixes into every sentence:

```
> what do you like doing?
  Yes , learning Yoland and America .
```

The fix is corpus warmup: run the original 37,000 training conversations
through the expanded model so the new dimensions learn basic English. At
~2 seconds per step on CPU, one full pass takes about 20 hours. We do it
in 5-minute bursts instead, chipping away a few hundred documents at a time.

We also added safety features along the way:
- **Ctrl+C checkpoint saving** — interrupt training anytime, progress is saved
- **Periodic saves every 400 steps** — automatic protection against crashes
- **`--load` guard** — forgetting to load the checkpoint before training now
  gives an error instead of silently wiping Mr . Classic's brain

---

## Teaching the Bigger Brain

At 49M, Mr . Classic can handle more complex material. We wrote him a new
book — "Mr . Classic Grows Up" — with longer, multi-sentence answers:

```
Q: are you alive?
A: No , not really . But I learn and I grow . Roland says
   that is close enough for now .

Q: what is the hardest thing for you?
A: Remembering new things without forgetting old things .
   My brain is small so new knowledge sometimes pushes
   out old knowledge .

Q: why is the sky blue?
A: Light from the sun hits the atmosphere and blue light
   scatters more than other colors . That is why the sky
   looks blue .
```

This is a different level from the old books that had one-line answers
like "Water is a liquid . People drink it to live ." The 49M brain has
room for reasoning, self-awareness, and personality in the same response.

---

## Where We Are Now

<!-- TODO: fill in after more training -->

---

## What We Learned

**You don't have to start over.** Weight expansion preserves everything the
model knew. The old knowledge is literally the same numbers in the same
positions — just with more room around them.

**Bigger isn't automatically better.** The new dimensions need training
before they help. An expanded model is temporarily worse than the original
because the new weights add noise. Warmup is essential.

**Growing slowly has value.** We expanded three times (10M → 15.5M →
22M → 49M) and each time had to warm up again. Jumping straight to the
target size might have been faster, but at each stage we did RL sessions
that reinforced his personality into the new dimensions. A child doesn't
wake up with an adult brain — they grow into it, and what they learn at
each stage shapes what comes next.

**Safety matters.** When your model takes 20+ hours to train, accidentally
wiping it is devastating. The `--load` guard and Ctrl+C handler are not
optional features — they're essential infrastructure.

**Think of it like raising a child.** You don't dump an encyclopedia on a
toddler. You grow their capacity first, teach fundamentals, then introduce
more complex material. Mr . Classic went from one-word answers to
multi-sentence reasoning — not by reading more data, but by having a
bigger brain to put it in.
