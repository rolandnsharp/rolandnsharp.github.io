---
title: "Designing v2: What a Small Transformer Needs in 2026"
date: 2026-03-01
layout: "base.njk"
tags: post
---

# Designing v2: What a Small Transformer Needs in 2026

We have been [building a language model from scratch](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/)
for six weeks. The current model is 49 million parameters, 12 layers deep, with a
256-token context window and a 2,188-token vocabulary. It trains on CPU. It generates
coherent English. It [learns from human feedback](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/).
It works.

But the field has moved. In the time since GPT-2 defined what a small transformer looks
like, researchers at HuggingFace, Meta, and Alibaba have published models at 125-500
million parameters that would embarrass GPT-2 at ten times the size. They did it with
five architectural changes and a different philosophy about training data.

This post is the technical blueprint for v2 — the
[model for life](/posts/a-model-for-life/). What needs to change, what stays the same,
and why.

---

## Where We Are

Vidya's current architecture is a GPT-2 style pre-norm transformer:

| | Vidya v1 |
|---|---|
| Parameters | 49M |
| Layers | 12 |
| Embedding dim | 576 |
| Attention heads | 8 (full MHA) |
| KV heads | 8 (same as query heads) |
| FFN intermediate | 2,304 (4x hidden) |
| Activation | GELU (tanh approx) |
| Normalization | RMSNorm (pre-norm) |
| Position encoding | RoPE (theta=10,000) |
| Embeddings | Tied |
| Vocabulary | 2,188 tokens |
| Context window | 256 tokens |
| Biases | None |
| Dropout | 0.1 |

This is a solid foundation. RMSNorm, RoPE, tied embeddings, no biases, pre-norm — all
of these are still standard in 2026. The model is not badly designed. It is designed for
2020.

---

## The Reference: SmolLM2 and MobileLLM

Two models define the state of the art for small transformers in 2026.

**SmolLM2-135M** (HuggingFace, February 2025) and **MobileLLM-125M** (Meta, 2024)
arrived at nearly identical architectures independently. When two research teams solve
the same problem and converge on the same answer, that answer is probably right.

| | SmolLM2-135M | MobileLLM-125M | Vidya v1 |
|---|---|---|---|
| Layers | 30 | 30 | 12 |
| Hidden dim | 576 | 576 | 576 |
| Query heads | 9 | 9 | 8 |
| KV heads | 3 (GQA) | 3 (GQA) | 8 (full MHA) |
| Head dim | 64 | 64 | 32 |
| FFN intermediate | 1,536 | 1,536 | 2,304 |
| Activation | SwiGLU | SwiGLU | GELU |
| Vocabulary | 49,152 | 32,000 | 2,188 |
| Context | 8,192 | 2,048 | 256 |
| Training tokens | 2 trillion | 1 trillion | 585 million |

The hidden dimension is the same — 576. The depth is 2.5 times ours. Everything else
is different. Five things need to change.

---

## Change 1: SwiGLU

Every small model published in 2024-2025 uses SwiGLU instead of GELU. The Phi models
were the last holdouts with GELU, and even they switched in later versions.

The difference is structural, not just a different activation curve. Our current FFN
has two weight matrices:

```
Current FFN (GELU):
  hidden = GELU(x @ W1)      W1: [576, 2304]
  output = hidden @ W2        W2: [2304, 576]

  2 matrices, 4x expansion
```

SwiGLU uses three matrices with a gating mechanism — one projection is passed through
SiLU (a smooth approximation of ReLU), and the result gates the other projection:

```
SwiGLU FFN:
  gate   = SiLU(x @ W_gate)   W_gate: [576, 1536]
  up     = x @ W_up           W_up:   [576, 1536]
  hidden = gate * up           (element-wise)
  output = hidden @ W_down     W_down: [1536, 576]

  3 matrices, 8/3x expansion
```

Three matrices instead of two, but with a smaller intermediate dimension — 8/3 times
the hidden dim instead of 4 times. The total parameter count per FFN layer stays
roughly the same. The gating mechanism lets the network learn which dimensions to
activate, which consistently outperforms applying the same activation to everything.

SiLU itself is simple: `SiLU(x) = x * sigmoid(x)`. Smooth, differentiable, no
hyperparameters. The backward pass through the gate multiplication and SiLU is
straightforward.

For Vidya, this means changes to three files: a new `silu` operation in `tensor.ml`, a
third weight matrix per layer in `model.ml`, and the gated FFN computation in
`forward.ml`. The checkpoint format changes — every layer gains one matrix — so this
requires a new checkpoint file.

---

## Change 2: Grouped Query Attention

In standard multi-head attention, every query head has its own key and value head.
Eight query heads means eight key heads and eight value heads. All independent, all
with their own learned projections.

Grouped Query Attention shares key and value heads across groups of query heads. With
9 query heads and 3 KV heads, every 3 query heads share one key head and one value
head:

```
Full MHA (current):
  Q heads: [1] [2] [3] [4] [5] [6] [7] [8]
  K heads: [1] [2] [3] [4] [5] [6] [7] [8]
  V heads: [1] [2] [3] [4] [5] [6] [7] [8]

  8 + 8 + 8 = 24 independent head projections

GQA 3:1 (v2):
  Q heads: [1] [2] [3] [4] [5] [6] [7] [8] [9]
  K heads: [  1  ] [  2  ] [  3  ]
  V heads: [  1  ] [  2  ] [  3  ]

  9 + 3 + 3 = 15 independent head projections
```

The K and V projection matrices shrink from `[576, 576]` to `[576, 192]` — one third
the size. This saves parameters, but more importantly it cuts the KV cache by 3x. For
a model that will eventually have a 2,048-8,192 token context window, the KV cache is
the memory bottleneck during inference. GQA makes long-context generation practical on
consumer hardware.

The quality cost is minimal. Both SmolLM2 and MobileLLM use 3:1 GQA at 125-135M
parameters and match or beat full-MHA models of the same size.

The implementation change is small. The K and V weight matrices get smaller. The
forward pass broadcasts each KV head across its group of query heads during the
attention computation. Everything else — RoPE, softmax, the output projection — stays
the same.

---

## Change 3: Depth

MobileLLM's central finding: for sub-billion parameter models, **depth matters more
than width**. A 125M model with 30 layers outperforms shallower, wider alternatives at
the same parameter count. SmolLM2 independently converged on the same number — 30
layers at 576 dimensions.

Our current model has 12 layers. That was appropriate for 10M parameters. At 135M, it
should be 30.

We [wrote previously](/posts/a-model-for-life/) about starting at 24 layers. The
research says 30. The HuggingFace optimal architecture study tested configurations
systematically and found 30-32 layers optimal for the 70M-200M range. We will start
at 30.

Each layer is one step of sequential reasoning. More layers means more steps of thought
before producing an output. For a model that needs to follow instructions, hold
conversations, and reflect on feedback, depth is the dimension that matters.

We cannot add depth to a trained model without disrupting the learned computation
chain. Width expansion works — we
[proved that](/posts/growing-mr-classic-from-10m-to-50m/). Depth expansion is harder.
This means v2 starts at 30 layers and stays there. The depth is permanent. Growth
happens by widening.

---

## Change 4: Vocabulary

Our current vocabulary is 2,188 tokens. SmolLM2 uses 49,152. MobileLLM uses 32,000.

A small vocabulary means more tokens per text. The word "reinforcement" might take
three tokens in our vocabulary but one token in a 32K vocabulary. This has three
consequences:

1. **Slower inference.** More tokens to generate means more forward passes per sentence.
2. **Shorter effective context.** A 256-token window with 3-token words sees about 85
   words. A 256-token window with 1.5-token words sees 170 words. The same window, twice
   the content.
3. **Harder learning.** The model has to learn multi-token patterns for common words
   instead of treating them as atomic units.

The cost of a larger vocabulary is the embedding table. At 576 dimensions with tied
embeddings:

| Vocabulary | Embedding params | % of 135M model |
|---|---|---|
| 2,188 | 1.3M | 1% |
| 8,000 | 4.6M | 3% |
| 16,000 | 9.2M | 7% |
| 32,000 | 18.4M | 14% |
| 49,152 | 28.3M | 21% |

At 32K, the embedding table is 14% of the model — reasonable. At 49K, it is 21% — a
significant fraction, but SmolLM2 demonstrates it is worth it. Recent research on
vocabulary scaling laws (NeurIPS 2024) confirms that optimal vocabulary size scales
with model size, and 32K-49K is appropriate for the 100M-500M range.

We will target 32,000 tokens. This is large enough for efficient tokenization of
English and leaves room for other languages without dominating the parameter budget.
The tokenizer will be trained on a representative corpus — conversation, the owner's
domain, any languages they might need — before the
[irreversible line](/posts/a-model-for-life/).

---

## Change 5: Context Window

256 tokens is a single paragraph. It is not enough for a conversation.

Modern small models handle 2,048 to 8,192 tokens. The constraint is memory — the
attention mechanism is O(n^2) in sequence length, and the KV cache grows linearly. For
a 135M model on a GPU with GQA, 2,048 tokens is comfortable. 8,192 is achievable.

For v2, we will start at **2,048 tokens** and design for expansion to 8,192. RoPE
supports longer contexts than the training length through frequency scaling (NTK-aware
or YaRN interpolation), so we can train at 2,048 and extend later without retraining.

The RoPE base frequency matters here. Our current theta is 10,000 (the original GPT-NeoX
value). SmolLM2 uses 100,000. Higher theta spreads the rotary frequencies more evenly
across positions, which helps the model distinguish between positions at longer
distances. We will use theta=100,000 for v2.

At 2,048 tokens, the model can see about 10-15 exchanges of conversation history. At
8,192, it can see an entire chapter of a book. For a
[model that learns from reading](/posts/a-model-for-life/), context length determines
how much the model can understand about what it reads.

---

## The v2 Spec

Putting it all together:

| | Vidya v1 | Vidya v2 |
|---|---|---|
| Parameters | 49M | ~135M |
| Layers | 12 | 30 |
| Embedding dim | 576 | 576 |
| Query heads | 8 | 9 |
| KV heads | 8 | 3 (GQA 3:1) |
| Head dim | 32 | 64 |
| FFN intermediate | 2,304 (4x) | 1,536 (8/3x) |
| Activation | GELU | SwiGLU |
| Normalization | RMSNorm | RMSNorm |
| Position encoding | RoPE (10K) | RoPE (100K) |
| Embeddings | Tied | Tied |
| Vocabulary | 2,188 | 32,000 |
| Context window | 256 | 2,048 |
| Biases | None | None |
| Dropout | 0.1 | 0.1 |

Same hidden dimension. Same normalization. Same position encoding scheme. Same
embedding strategy. Same bias-free design. But deeper, with a modern FFN, efficient
attention, a real vocabulary, and a context window that can hold a conversation.

This is the starting configuration. The
[growth path](/posts/a-model-for-life/) widens from here:

```
v2.0:  30 layers, 576 dim    (~135M params)   <- start here
v2.1:  30 layers, 768 dim    (~227M params)   <- widen when needed
v2.2:  30 layers, 960 dim    (~342M params)   <- widen again
v2.3:  30 layers, 1280 dim   (~587M params)   <- still the same model
```

Same model throughout. Same 30 layers. Same accumulated knowledge. Just wider matrices
with more room for what the model has learned.

---

## What We Keep

Not everything changes. The things Vidya already does right:

**RMSNorm.** Every modern small model uses it. We have used it from the start.
Learnable affine scale, no bias, pre-norm placement. Nothing to change.

**RoPE.** Universal standard. We increase theta from 10,000 to 100,000 for longer
context, but the implementation is the same — precomputed frequency tables, applied to
Q and K before attention.

**Tied embeddings.** Every small model ties input and output embeddings. We have done
this from the start. At 32K vocabulary and 576 dimensions, tying saves 18.4M
parameters — a significant fraction of a 135M model.

**No biases.** Modern transformers drop all bias terms. Fewer parameters, no measurable
quality loss. We never added them.

**Pre-norm.** Normalize before attention and FFN, not after. Standard since GPT-2
variants, confirmed by every subsequent model. We do this already.

**Residual scaling.** Our output projections are initialized with reduced standard
deviation to keep the residual stream bounded across many layers. This becomes more
important, not less, at 30 layers.

**The OCaml framework.** The autograd engine, the BLAS integration, the training loop,
the checkpoint system, the RL infrastructure — all of this carries forward. v2 is a new
model definition and forward pass, not a new framework.

---

## The Data Question

Architecture is the easy part. The hard part is data.

SmolLM2-135M trains on 2 trillion tokens. We have 585 million. That is a 3,400x gap.
Modern small models are massively overtrained — SmolLM2 sees 15,000 tokens per
parameter, far beyond the Chinchilla-optimal 20. The current consensus is that small
models benefit disproportionately from seeing more data, because they need more
exposure to learn patterns that larger models pick up in fewer passes.

We cannot close a 3,400x gap. But three things work in our favour:

**Data quality over quantity.** Microsoft's Phi-1.5 demonstrated that 27 billion tokens
of curated, high-quality data can match or beat 300 billion tokens of web crawl. The
composition of the data matters more than the volume. Our 2.4 million conversations are
curated dialogue — not random web text, not noisy crawls. Quality per token is high.

**Distillation.** Llama 3.2's 1B model was trained with logits from the 8B and 70B
models as targets. The small model learns to mimic the large model's probability
distributions, not just predict the next token from raw text. We can generate training
data from Claude or other large models — not the raw text, but the reasoning patterns
and knowledge structure.

**RL is the differentiator.** No other small model at this scale has interactive
human-in-the-loop reinforcement learning. SmolLM2 is trained once and frozen.
MobileLLM is trained once and frozen. Our model
[keeps learning](/posts/a-model-for-life/) — from books, from conversation, from its
owner's corrections. The pre-training data gives it a foundation. The RL makes it
personal. A smaller foundation with years of targeted RL may outperform a larger
foundation with none.

We will not match SmolLM2 on benchmarks. That is not the goal. The goal is a model
that knows its owner, learns from its owner, and gets better every day. The benchmarks
measure general capability. We are building specific capability, forged over time.

---

## The Implementation Path

The five changes have different implementation costs:

| Change | New OCaml code | Checkpoint impact | Difficulty |
|---|---|---|---|
| SwiGLU | `silu` op, gated FFN | New format (3 FFN matrices) | Medium |
| GQA | Smaller K/V projections, head broadcasting | New format (smaller K/V) | Medium |
| Depth (30 layers) | Change `n_layer` constant | New format (more layers) | Easy |
| Vocabulary (32K) | Retrain BPE tokenizer | New format (larger embeddings) | Easy |
| Context (2,048) | Change `block_size`, increase RoPE theta | Compatible | Easy |

All five changes break checkpoint compatibility. This is expected — v2 is a new model,
trained from scratch. The current v1 weights are an experiment. The lessons from v1 —
about training schedules, data pipelines, RL infrastructure, weight expansion — carry
forward. The weights do not. We have not yet crossed the
[irreversible line](/posts/a-model-for-life/).

The order of implementation:

1. **SwiGLU + GQA** — the two architectural changes that touch the forward pass
2. **Depth + vocabulary + context** — configuration changes
3. **Retrain tokenizer** on a broad corpus at 32K tokens
4. **Train from scratch** on GPU (RTX 3060 first, then
   [Tenstorrent Blackhole](/posts/burn-the-stack-llms-without-nvidia/))
5. **Validate with RL** — test that interactive teaching still works at 135M
6. **Cross the line** — begin the irreversible phase of personal RL teaching

---

## What This Means

v1 taught us how to build a transformer from scratch, how to train it, how to expand
it, how to teach it. It was never meant to be the final model. It was meant to be the
model we learned on.

v2 is the model we keep. Same OCaml framework. Same philosophy — small, dense, open,
personal. But built to the standard of 2026, not 2020. Deeper. Wider vocabulary.
Longer context. Modern attention. Modern activation. Designed from day one to be
[widened without losing knowledge](/posts/a-model-for-life/), taught through
[reinforcement learning](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/),
and run on [open silicon](/posts/burn-the-stack-llms-without-nvidia/).

The architecture is not exotic. It is SmolLM2 and MobileLLM's proven configuration,
implemented from scratch in OCaml, with no dependencies that could disappear. The
innovation is not in the architecture — it is in what we do with it afterward. A model
that learns from one person, for the rest of their life, on hardware they own.

That starts with getting the foundation right.

---

*See also: [A Model for Life](/posts/a-model-for-life/),
[Six Ways to Teach Mr. Classic](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/),
[Feeding Mr. Classic](/posts/feeding-mr-classic-2m-conversations-and-two-fixes/).*

*Co-authored with [Claude](https://claude.ai/).*
