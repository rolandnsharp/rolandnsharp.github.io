---
title: "A Model for Life"
date: 2026-03-01
layout: "base.njk"
tags: post
---

# A Model for Life

Every language model in production today is disposable. OpenAI trained GPT-4, learned
from it, threw it away, and trained GPT-5. The weights are a snapshot — useful for a
while, then replaced by something better. The training data is the asset. The model is
the product. When the product is obsolete, you build a new one.

We're building something different.

---

## The Vision

A small, dense language model that learns from its owner over years. Not a product. Not
a service. A companion that accumulates knowledge through thousands of reinforcement
learning sessions — your preferences, your judgment, your corrections, your style. Every
interaction makes it more yours.

After a year of daily RL sessions, the weights contain something that can't be
reproduced from any dataset: the accumulated effect of one person teaching one model,
day after day, about what good looks like. After five years, it knows you better than
any foundation model ever could, because it wasn't trained on the internet — it was
trained on *you*.

Those weights are irreplaceable. You can't retrain from scratch because the training
data doesn't exist in a file. It exists in the history of every thumbs up, every typed
correction, every afternoon spent teaching. The model is not disposable. It's for life.

This changes everything about how you design it.

---

## Why Small

The big labs build 400-billion parameter models because they serve millions of users who
each want something different. The model has to be a generalist — good enough at
everything for everyone. That requires enormous capacity.

A personal model serves one person. It can specialise completely. It doesn't need to
know medicine, law, Mandarin, and Python if its owner only cares about three of those.
Every parameter can be dedicated to what matters to one human.

At 50-500 million parameters, the model:

- **Trains on a single GPU.** No cluster, no cloud, no rental. You own the hardware,
  you own the training process, you own the weights. Nobody can revoke access.
- **Runs inference instantly.** A 200M model on a desktop GPU generates tokens faster
  than you can read them. No latency, no API calls, no rate limits.
- **Fits on edge devices.** A quantised 200M model is ~100MB. It runs on a phone, a
  Raspberry Pi, a handheld. Your model goes where you go.
- **Can be taught interactively.** RL sessions with a 200M model take seconds per step.
  You can sit with it, teach it, see results immediately. A 70B model takes minutes per
  step — too slow for interactive teaching.

Small isn't a limitation. It's a requirement. The model has to be small enough that one
person can train it, teach it, run it, and carry it with them.

---

## Why Dense

Every major foundation model in 2026 uses Mixture of Experts — hundreds of billions of
total parameters, but only a few billion active per token. A router network decides
which experts fire for each input. This is efficient for serving millions of users,
because different users activate different experts.

For a personal model, MoE is wrong:

**Teaching is diluted.** When you give the model feedback during RL, only the active
experts get updated. The other 95% of the parameters never see your correction. Your
personal knowledge is scattered across a sparse routing table instead of woven through
the whole model.

**Behaviour is unpredictable.** The same prompt can activate different experts depending
on subtle input differences. Debugging why the model said something wrong means
understanding a routing decision you can't see.

**Storage is wasteful.** An 80B MoE model with 3B active parameters still needs 80B
parameters in memory. You're paying the storage cost of a huge model for the compute
of a small one. A dense 500M model uses 500M parameters of storage *and* 500M
parameters of compute. Nothing is wasted.

Dense means every parameter fires on every token. When you teach the model, all of it
learns. When you debug the model, all of it is visible. When you run the model, all of
it works. Simple, predictable, fully yours.

---

## Start Deep, Grow Wide

A transformer has two dimensions: depth (number of layers) and width (embedding
dimension, number of heads). For small models, depth matters more. Each layer is one
step of sequential reasoning — more layers means more steps of thought before
producing an output.

Width gives capacity per step. Depth gives steps per token. A deep narrow model reasons
more carefully with less memory. A wide shallow model remembers more but thinks less.
For a model that needs to hold a conversation, follow instructions, and reflect on
feedback, depth is more valuable than width.

The critical insight: **you can grow wider later without losing knowledge.**

Expanding width means padding weight matrices with new dimensions. The existing weights
stay exactly where they are — the model's learned knowledge lives in the original
dimensions, untouched. The new dimensions start as noise and get trained in over time.
We've already done this once, growing
[Mr. Classic from 10M to 49M parameters](/posts/growing-mr-classic-from-10m-to-50m/)
by widening from 256 to 576 dimensions. The model kept everything it knew and gained
capacity for more.

Going the other direction — starting wide and adding depth — is harder. Inserting new
layers into a trained pipeline disrupts the learned computation chain. It's possible
with careful initialisation, but messier than width expansion.

So the architecture strategy is: start deeper than you think you need, at a moderate
width. When the model outgrows its capacity, widen it. The personal knowledge
accumulated through years of RL survives every expansion because it lives in the
original dimensions.

```
v1:  24 layers, 384 dim    (~50M params)   ← start here
v2:  24 layers, 512 dim    (~90M params)   ← widen when needed
v3:  24 layers, 768 dim    (~200M params)  ← widen again
v4:  24 layers, 1024 dim   (~350M params)  ← still the same model
```

Same model throughout. Same weights at the core. Same accumulated knowledge. Just more
room to grow into.

---

## The Tokenizer Is Forever

Every other part of the model can grow. The tokenizer can't.

Token IDs are the model's alphabet. Every weight in the embedding matrix, every
pattern the attention heads have learned, every association in the feed-forward layers
is keyed to specific token IDs. Changing the tokenizer changes the alphabet. The model
has to relearn reading.

You can add a few tokens incrementally — initialise the new embedding from the
subtokens it replaces, fine-tune briefly, done. But you can't restructure the
vocabulary. You can't go from 2,000 tokens to 32,000 tokens without the model
forgetting everything it knows.

This means the tokenizer has to be right from the start. For a model that's meant to
last a lifetime:

- **Large enough for your languages.** If you'll ever want French or Japanese, the
  tokenizer needs to cover them now. Adding a whole language later means thousands of
  new tokens bolted onto a vocabulary that wasn't designed for them.
- **Small enough for your model.** Every token is a row in the embedding matrix. 32,000
  tokens at 384 dimensions is 12.3M parameters — a quarter of a 50M model spent on
  the alphabet alone.
- **Standard BPE on a representative corpus.** Train the tokenizer on the kind of text
  the model will see for its whole life — conversation, your domain, your languages.

We're currently at 2,188 tokens. That's too small for a lifetime model. Before we begin
serious RL teaching, we'll retrain the tokenizer on a broader corpus at 8,000-16,000
tokens. This is the one architectural decision that has to be right before the
irreversible phase begins.

---

## The Irreversible Line

There's a clear boundary in this project's timeline:

**Before RL:** Everything is reproducible. The training data exists in files. The model
can be retrained from scratch. Architecture changes cost time but lose nothing
permanent. This is where we are now — experimenting, iterating, learning what works.

**After RL:** The weights contain something irreproducible. Each RL session deposits
human judgment into the parameters. The model can still be expanded (wider), fine-tuned
(more data), and improved (better RL methods). But it can never be reset. Starting
from scratch means losing everything the human taught it.

This is the line between a machine learning experiment and a personal AI. Before the
line, the model is a tool. After the line, it's a relationship.

The current training run — 2.4 million conversations, 60 days on CPU — is the last
experiment before the line. We're learning how the model handles large-scale data. When
this run finishes, we'll do our first RL sessions on this model. Not because this model
is the final architecture — it isn't — but because we need to learn how RL feels at
this scale before we design v2.

v2 will be the model for life. Deeper. Better tokenizer. Bigger context window. Built
on everything we learned from v1. And once we start teaching v2, we never go back.

---

## The Personality Book

The irreversible line is real, but we're not reckless. From the first RL session, every
interaction gets logged:

```json
{"step": 1, "prompt": "hello", "responses": ["Hi!", "Hey there", ...], "selected": 2}
{"step": 2, "prompt": "what is forth", "responses": [...], "typed": "Forth is a..."}
```

Every prompt. Every generated response. Every human selection. Every typed correction.
A few kilobytes per session. Years of teaching would be megabytes.

These logs can't be replayed as RL sessions. If we rebuilt the model from scratch and
ran the same prompts, it would generate completely different responses. The human
selected response 3 out of 5 — but a new model's response 3 is a different sentence
entirely. The selection is meaningless without the original responses it was choosing
between.

What the logs *can* become is a **personality book**. Extract every selected response
and every human-typed correction. Discard the rejected responses. What remains is a
corpus of "this is what good output looks like" — curated by the owner over years:

```
From the logs:
  prompt: "tell me about forth"
  human typed: "Forth is a stack-based language where..."

  prompt: "how are you today"
  human selected: "I'm doing well. What have you been working on?"
```

Feed this to a new model as supervised training — ordinary book training, not RL. The
model learns the shape of your preferences, the tone you want, the topics you care
about. It reads a book written by its past self's best moments, curated by its owner.

It won't be the same model. The original learned *why* those responses were good through
thousands of trial-and-error corrections. The rebuilt model just learns *what* good
responses look like by reading examples. It's the difference between learning to cook
by years of practice and tasting, versus reading a recipe book written by someone who
did. The recipes are good. The intuition is missing.

But it's the difference between losing everything and recovering 80%. Three layers
of protection:

| Layer | What it preserves | Recovery |
|---|---|---|
| Checkpoints (every 5K steps) | Exact weights | Perfect |
| Weight backups (weekly copy) | Recent weights | Lose a week at most |
| Interaction logs (every session) | Teaching history | ~80% — similar, not identical |

The logs cost nothing. Start them on day one.

---

## What Makes This Different

Every other AI project in the world treats model weights as disposable. Train,
evaluate, deploy, replace. The training data and the training code are the assets.
The weights are artifacts.

We're inverting that. The weights are the asset. They contain something no dataset
can reproduce — years of one person's judgment, accumulated through daily interaction.
The code can be rewritten. The data can be re-collected. The weights are the soul.

This means:

- **The model must be small enough to own.** If it needs a datacenter, you don't own it.
  If it needs a cloud API, you don't own it. If it runs on your GPU, on your desk,
  on your hardware — you own it.
- **The model must be dense enough to teach.** Every RL session must update the whole
  model, not a random subset of experts.
- **The architecture must be growable.** The model will outlive any single piece of
  hardware. It needs to expand without losing knowledge.
- **The software must be open.** If Vidya depended on PyTorch, a breaking change in
  PyTorch could kill the model. We wrote everything from scratch in OCaml for this
  reason. The code has no external dependencies that could disappear.
- **The hardware must be open.** If the model can only run on NVIDIA, NVIDIA controls
  your access. [Open silicon](/posts/burn-the-stack-llms-without-nvidia/) means no
  single vendor can take your model away.

Small. Dense. Deep. Open. Growable. Personal. Permanent.

That's a model for life.

---

*See also: [Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Six Ways to Teach Mr. Classic](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/).*

*Co-authored with [Claude](https://claude.ai/).*
