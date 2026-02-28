---
title: "Feeding Mr. Classic: 2.4 Million Conversations and Two Training Bugs"
date: 2026-02-28
layout: "base.njk"
tags: post
---

# Feeding Mr. Classic: 2.4 Million Conversations and Two Training Bugs

In the [last post](/posts/growing-mr-classic-from-10m-to-50m/), we grew Mr. Classic from
10 million to 49 million parameters by widening his weight matrices. Bigger brain, same
knowledge. The new dimensions were full of noise and needed training to become useful.

So we pointed him at 37,000 conversations and let him train. Loss dropped to around 2.2 and
stayed there. He was memorising the data.

49 million parameters, 37 thousand conversations. That's like giving someone a university-sized
brain and only teaching them the contents of a single bookshelf.

---

## What Is Loss?

Before going further, we should explain what "loss" actually means, because everything in
training revolves around this one number.

At each step, the model reads a sequence of tokens and tries to predict what comes next.
For every position in the sequence, it produces a probability distribution over its entire
vocabulary (~2,188 tokens). Loss measures how wrong those predictions are:

```
loss = -log(P(correct next token)), averaged over all positions
```

If the model assigns 100% probability to the correct token, loss is 0 (perfect). If it
assigns 0.05% (random guessing across 2,188 tokens), loss is about 7.7. Lower is better.

Here's what different loss values mean in practice:

| Loss | P(correct token) | What it means |
|------|------------------|---------------|
| 7.7  | 0.05%            | Random guessing |
| 4.0  | 1.8%             | Early training — the model has learned some structure |
| 2.8  | 6.1%             | Where we got stuck on the new data |
| 2.2  | 11.1%            | Where we were on the old 37K dataset |
| 1.0  | 36.8%            | Very confident predictions |
| 0.0  | 100%             | Perfect — impossible in practice on real language |

Loss of 2.2 on 37K conversations sounds decent, but it partly reflects memorisation. The
model has seen each conversation hundreds of times and can predict specific phrasings. Loss
of 2.8 on 2.4 million diverse conversations is actually measuring something harder — can the
model predict *language it's never seen before*?

In Vidya, loss is computed in `train.ml`:

```ocaml
(* For each position: get the model's predicted probabilities,
   look up the probability assigned to the correct next token,
   take -log of that probability. Average over all positions. *)
let compute_loss model tokens =
  let logits = Forward.gpt_forward_batch model input_tokens seq_len in
  let losses = Array.init seq_len (fun i ->
    let logits_i = Tensor.row logits i in
    let probs_i = Tensor.softmax logits_i in
    Tensor.nll probs_i tokens.(i + 1)    (* nll = -log(prob) *)
  ) in
  Tensor.mean losses
```

---

## The Chinchilla Problem

In 2022, DeepMind published the Chinchilla scaling laws: for compute-optimal training, you
want roughly 20 tokens of training data per parameter. Our 49M model wants:

```
49,000,000 params x 20 tokens/param = 980,000,000 tokens
```

Nearly a billion tokens. We had about 6.4 million — 37K short conversations. That's 0.13
tokens per parameter. We were 150x below the optimal ratio.

Now, Chinchilla assumes training from scratch on random weights. Mr. Classic already had a
foundation — he'd been trained on these 37K conversations and further refined with RL. He
didn't need a full billion tokens. But he definitely needed more than 6.4 million.

---

## The Data Hunt

We needed natural dialogue data — not instruction-following datasets (those teach a model
to be an assistant), but actual conversations between people. Mr. Classic's architecture is
wide and shallow (576 dimensions, 18 heads, only 12 layers) with a 256-token context
window. Short, diverse, natural conversations are ideal.

We downloaded and converted 12 datasets:

| Dataset | Conversations | Type |
|---------|--------------|------|
| SODA (Allen AI) | 1,500,000 | Social dialogue — the crown jewel |
| WildChat-1M | 253,000 | Real user-ChatGPT conversations |
| UltraChat | 219,000 | Multi-turn synthetic dialogue |
| Anthropic HH-RLHF | 167,000 | Helpful/harmless dialogue pairs |
| Prosocial Dialog | 165,000 | Conversations about social norms |
| ShareGPT 90K | 34,000 | Real ChatGPT conversations |
| Empathetic Dialogues | 23,000 | Emotionally grounded conversations |
| Wizard of Wikipedia | 22,000 | Knowledge-grounded dialogue |
| ShareGPT English | 22,000 | English-only ChatGPT conversations |
| Dolly 15K | 14,700 | Databricks instruction-following |
| Blended Skill Talk | 6,800 | Multi-skill dialogue |
| OASST2 | 4,900 | Open Assistant conversations |
| **Total** | **2,410,971** | |

Each dataset was converted to the same format — one conversation per line, with `<|user|>`
and `<|assistant|>` markers:

```
<|user|> How was your weekend? <|assistant|> It was great, I went hiking with
friends. <|user|> Where did you go? <|assistant|> We went to the national park...
```

Conversations longer than 4,000 characters were filtered out — our 256-token context window
can't use them anyway, and with a wide (not deep) model, we benefit more from many short
conversations than fewer long ones.

The final file: `chat_input_all.txt`, 2.3 GB, roughly 585 million tokens. That gives us a
12x tokens-per-parameter ratio. Not the ideal 20x, but with 2 epochs we'd get 24x
token-passes through the model — close enough.

This was not a smooth process. SODA's parquet files downloaded via curl were silently
truncated (missing footer bytes). Empathetic Dialogues had no direct data files and needed
HuggingFace's auto-converted parquet branch. ShareGPT English used different JSON keys
(`user`/`text` instead of `from`/`value`). One dataset — Synthetic Persona Chat — had
entirely empty conversation columns. Dataset wrangling is unglamorous work.

---

## The First Training Run

We started the training run:

```
dune exec bin/main.exe -- --load --book ../../chat_input_all.txt --epochs 2
```

2,410,971 documents times 2 epochs = 4,821,942 training steps. At ~2.15 seconds per step on
CPU, ETA: 120 days.

We left it running overnight. After 16 hours and 28,000 steps:

```
step 27100 / 4821942 | loss 2.8748
step 27200 / 4821942 | loss 2.8278
step 27300 / 4821942 | loss 2.8425
step 27400 / 4821942 | loss 2.8031
step 27500 / 4821942 | loss 2.8970
step 27600 / 4821942 | loss 2.7594
step 27700 / 4821942 | loss 2.8313
step 27800 / 4821942 | loss 2.8097
step 27900 / 4821942 | loss 2.9096
step 28000 / 4821942 | loss 2.7620
```

Loss was bouncing between 2.7 and 2.9. Flat. No downward trend. After 28,000 steps the
model had learned essentially nothing from the new data.

Something was wrong.

---

## Bug #1: Fixed Learning Rate

The book training code was using a **fixed learning rate** of 1e-4:

```ocaml
(* The old code — every step used the same LR *)
Vidya.Train.adam_step_fixed params adam step 1e-4;
```

This is fine for interactive RL training where you're doing a few hundred steps and want
consistent, gentle updates. But for a 4.8 million step training run on diverse new data, it's
completely wrong.

The problem is that 1e-4 is too conservative to learn from scratch on new data, AND it
never changes. The model needs:

1. **Low LR at the start** — while the optimizer is building its internal estimates
2. **High LR in the middle** — to learn aggressively from the new data
3. **Low LR at the end** — to fine-tune and settle into stable weights

This is exactly what a **cosine learning rate schedule** provides — the same schedule used by
GPT, LLaMA, and virtually every modern language model:

```
LR
3e-4 |     ╭──────╮
     |    ╱        ╲
     |   ╱          ╲
     |  ╱            ╲
0    | ╱              ╲___
     +─────────────────────
       warmup    decay
```

We set the peak at 3e-4 — three times lower than the from-scratch training peak of 1e-3.
The model already has a foundation (37K conversations of learned English), so we don't want
to be as aggressive as training from random weights. But we need to be three times more
aggressive than the old fixed 1e-4.

```ocaml
(* The fix — cosine schedule with linear warmup *)
let peak_lr = 3e-4 in
let warmup_steps = 2000 in
let get_lr step =
  if step < warmup_steps then
    (* Linear warmup: 0 → peak_lr over 2000 steps *)
    peak_lr *. float_of_int step /. float_of_int warmup_steps
  else
    (* Cosine decay: peak_lr → ~0 over remaining steps *)
    let progress =
      float_of_int (step - warmup_steps)
      /. float_of_int (n_steps - warmup_steps) in
    peak_lr *. 0.5 *. (1.0 +. cos (Float.pi *. progress))
in
```

### Why the warmup matters: Adam state

To understand why we need a warmup phase, you need to understand what Adam is actually doing.

Adam is the optimiser — the algorithm that decides how to update each of the 49 million
weights after every training step. Unlike basic gradient descent (which just says "move each
weight in the direction that reduces loss"), Adam tracks two running averages **per
parameter**:

- **m (first moment / momentum):** which direction has this weight been moving? If gradients
  keep pushing the same way, Adam pushes harder. Like a ball rolling downhill — it builds
  momentum.

- **v (second moment / variance):** how much does this weight's gradient fluctuate? Volatile
  weights get smaller updates. Stable weights get bigger ones. This is Adam's killer
  feature — it automatically adapts the step size for each of the 49 million parameters
  independently.

For 49M parameters, Adam stores 49M `m` values + 49M `v` values = 98M extra floats, about
750 MB of optimizer state.

The critical detail: **Adam state starts at zero every time you restart training.** Each
time you run `--book`, the code creates fresh `m` and `v` arrays:

```ocaml
let adam = Vidya.Train.init_adam params in
(* adam.m = [0.0, 0.0, 0.0, ...] — 49M zeros *)
(* adam.v = [0.0, 0.0, 0.0, ...] — 49M zeros *)
```

With all-zero estimates, Adam is flying blind. It doesn't know which direction any weight
should move, or how volatile any gradient is. The bias correction terms (bc1, bc2) partially
compensate, but Adam still needs ~1000-2000 steps before its estimates are reliable.

This is why the warmup phase exists: keep the learning rate low while Adam figures out
what's going on, then ramp up once it has reliable estimates.

---

## Bug #2: No Per-Epoch Shuffling

The second bug was subtler. Look at how the old code picked which document to train on:

```ocaml
for step = 0 to n_steps - 1 do
  let doc_idx = step mod n_docs in    (* 0, 1, 2, 3, ... *)
  let tokens = tokenized.(doc_idx) in
  ...
```

This cycles through documents in order: doc 0, doc 1, doc 2, ... doc 2,410,970, then back to
doc 0, doc 1, doc 2... The exact same order, both epochs.

The data file was shuffled once when we created it. But seeing the same sequence twice means
the model can learn ordering artifacts — patterns in which conversations follow which, rather
than patterns in the conversations themselves.

Standard practice is to **shuffle between epochs**. Every pass through the data should see
documents in a new random order. The fix uses a permutation array that gets reshuffled at
each epoch boundary:

```ocaml
(* Create a shuffle index: [0, 1, 2, ..., n_docs-1] *)
let order = Array.init n_docs (fun i -> i) in
Vidya.Utils.shuffle order;   (* Fisher-Yates shuffle *)

for step = 0 to n_steps - 1 do
  (* Reshuffle at each epoch boundary *)
  if step > 0 && step mod n_docs = 0 then
    Vidya.Utils.shuffle order;
  (* Map step → shuffled doc index *)
  let doc_idx = order.(step mod n_docs) in
  ...
```

Each epoch still sees every document exactly once. But the order is completely different.

---

## Both Bugs Together

These bugs compound. A fixed learning rate means the model makes the same tiny updates from
start to finish — no aggressive learning phase, no settling phase. Sequential document
ordering means what little the model does learn includes ordering artifacts from the data
file.

The result: 16 hours of training that produced no measurable improvement. Loss flat at 2.8.
The model was technically updating its weights each step, but the updates were too small and
too noisy to move the needle.

---

## The Fix

Both changes go into the book training function in `main.ml`. The training step is now
inlined (rather than calling the `train_step` helper) so we can pass the cosine-scheduled
LR:

```ocaml
(* Each training step: *)
let (loss, _) = Vidya.Train.compute_loss model tokens in
Vidya.Tensor.backward loss;              (* backpropagate gradients *)
Vidya.Train.clip_grad_norm params;       (* cap gradient norm at 1.0 *)
let lr = get_lr step in                  (* cosine-scheduled LR *)
Vidya.Train.adam_step_fixed params adam step lr;
```

And the log output now shows the current learning rate so we can verify the schedule is
working:

```
step 100 / 4821942 | loss 3.1234 | lr 1.50e-05 | 215s    ← warmup
step 2500 / 4821942 | loss 2.8001 | lr 3.00e-04 | 5375s  ← peak
step 2000000 / 4821942 | loss 2.31 | lr 1.80e-04 | ...    ← decaying
```

---

## Numbers

Some concrete numbers from this experiment:

- **Model:** 49M parameters (576 dim, 18 heads, 12 layers, 256-token context)
- **Old data:** 37K conversations, ~6.4M tokens (0.13 tokens/param)
- **New data:** 2.4M conversations, ~585M tokens (12x tokens/param)
- **With 2 epochs:** ~1.17B token-passes (24x effective ratio)
- **Training speed:** ~2.15 seconds/step on CPU (no GPU)
- **Wasted run:** 28,000 steps, ~16 hours, zero improvement
- **Time to diagnose:** ~1 hour of staring at flat loss curves

---

## What We Learned

**A fixed learning rate is not a learning rate schedule.** This seems obvious in hindsight.
Every major language model uses a cosine or linear decay schedule. But when you're building
everything from scratch, it's easy to use the simplest thing that works for small
experiments and forget to upgrade it for large runs. The interactive RL training works fine
with a fixed 1e-5 because it runs for hundreds of steps, not millions.

**Shuffling between epochs matters.** One shuffle when the data file is created is not
enough. Each epoch needs its own random permutation. This is a one-line fix
(`shuffle order` at epoch boundaries) that's easy to forget because the training loop still
runs fine without it — it just learns worse.

**Look at the learning rate, not just the loss.** Our log output originally showed only
loss and elapsed time. Adding the current LR to the output makes it immediately obvious
whether the schedule is working. If you see the same LR value at step 100 and step 100,000,
something is wrong.

**Continued pre-training is not fine-tuning.** Fine-tuning uses a tiny learning rate (1e-5)
because you're making small adjustments to a model that already knows the domain. Continued
pre-training on a 60x larger dataset is closer to training from scratch — you need a real
learning rate schedule, just with a lower peak than you'd use for random initialisation.

**CPU training at 49M params is slow but not impossible.** At 2.15 seconds per step, one
full epoch through 2.4M documents takes about 60 days. That's a long time. But with
checkpoints every 5000 steps and Ctrl+C safety, you can interrupt and resume, test
intermediate checkpoints with RL sessions, and chip away at it over weeks. Not everything
needs a GPU on day one — but we're getting closer to needing one.

*Co-authored with [Claude](https://claude.ai/).*
