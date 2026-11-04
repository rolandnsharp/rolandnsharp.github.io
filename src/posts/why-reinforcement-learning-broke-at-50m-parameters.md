---
title: "Why Reinforcement Learning Broke at 50M Parameters"
date: 2026-03-03
layout: "base.njk"
tags: post
---

# Why Reinforcement Learning Broke at 50M Parameters

In the [first RL post](/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/),
we described a simple method: generate five responses, human picks the best one,
update the weights. At 10 million parameters, the system ran and the model
picked up a few things, such as its name, but it
[did not learn to talk well](/mr-classic-learns-to-read/): single corrections
often failed to stick, and it hit a ceiling.

Then we [grew Mr . Classic to 49M parameters](/growing-mr-classic-from-10m-to-50m/).
The same RL method did worse. Most attempts to teach the model online made it
worse than where it started. We tried eight different approaches over
two days. None of them worked.

This is what happened and why.

---

## The Setup

The 49M model had been book-trained on a personality file — 369 question-answer
pairs covering greetings, name, creator, interests, self-awareness. Ten epochs,
3690 gradient steps, final loss 0.28. The model knew its material cold:

```
> hello
Hello . What can I help you with ?

> what is your name?
Vidya . It means knowledge in Sanskrit .

> who created you?
Roland created me . He is a software developer in Johannesburg .
```

Both facts in that last answer are wrong: Roland lives in Australia and uses
they/them. The model invented both details, which is typical of what a 50M
model produces when it fills a gap.

Then we started interactive RL. Same method as before: present a prompt, generate
five candidates at temperature 0.7, human picks the best one or types a better
response, update the weights.

Within five conversations, the model had forgotten how to say hello.

---

## Attempt 1: Lower the Learning Rate

The 10M model used a learning rate of 1e-4 for RL. At 49M, this was immediately
destructive — a single gradient step visibly damaged the output. We dropped to
1e-5.

At 1e-5, the model didn't degrade as fast, but it didn't learn either. The
gradient signal from one short response (~10 tokens) spread across 49 million
parameters was too dilute to move anything. We were stuck between "too fast,
destroys knowledge" and "too slow, learns nothing."

We tried 5e-5 as a compromise. Same result — degradation, just slower.

---

## Attempt 2: More Repeats

If one gradient step is too weak, do four. We increased `n_repeats` from 1 to 4
at 1e-5. Each selected response got trained on four times before moving to the
next prompt.

The model learned briefly. For about five conversations, responses improved.
Then it collapsed. The repeated gradients from short sequences accumulated noise
faster than signal. By conversation 10, the model was producing fragments.

---

## Attempt 3: Load Adam State

Fresh Adam optimizer state (zero momentum, zero variance) means early gradients
are poorly scaled. The model had been book-trained with a warm Adam state — we
were throwing that away and starting cold for RL.

We loaded the Adam state from the book training checkpoint. This actually helped.
The model peaked around conversation 4 with "hello" appearing in 4 out of 5
candidates and the name question at loss 0.15:

```
step 80  | loss 0.15 | lr 1.00e-05
Vidya . It means knowledge in Sanskrit .

step 81  | loss 0.29 | lr 1.00e-05
Hello . What can I help you with ?
```

Then it degraded again. The human typed a response the model couldn't generate
(loss 2.1), and that single high-loss gradient step corrupted what the model had
just learned.

---

## Attempt 4: Loss Threshold

If high-loss typed responses are destructive, skip them. We added a threshold:
if the training loss exceeds 1.5, don't do extra repeats. Only reinforce
responses the model was already close to producing.

This helped with stability but killed the most powerful part of RL — the ability
to teach the model things it can't yet generate. The whole point of typing a
response is to push beyond the model's current capability. With the threshold,
we could only nudge, never push.

---

## Attempt 5: Anchor Pull

After each RL step, pull the weights back toward their book-trained values. We
called this "elastic weight consolidation" at the time, but it is not EWC.
Real EWC (Kirkpatrick et al., 2017) adds a penalty weighted by the Fisher
information of each parameter, so weights that mattered for the old task are
held tighter than weights that didn't. What we wrote is a plain interpolation
toward the anchor, the same strength for every weight: an EWC-like penalty
without the Fisher weighting.

```ocaml
let elastic_pull params anchor alpha =
  let offset = ref 0 in
  params |> Array.iter (fun p ->
    let n = Array.length p.Tensor.data in
    for i = 0 to n - 1 do
      p.Tensor.data.(i) <- (1.0 -. alpha) *. p.Tensor.data.(i)
                            +. alpha *. anchor.(!offset + i)
    done;
    offset := !offset + n)
```

The aim is loosely the same as the KL penalty in RLHF — keep the model from
drifting too far from its base — though a KL penalty constrains the model's
outputs, while this constrains the weights directly. Alpha of 0.01 gives a
gentle pull, 0.1 a strong one.

With anchor pull at 0.02, the model was more stable. It stopped collapsing
entirely. But it also stopped learning. Each pull moves every weight 2% of the
way back toward the anchor, so whatever a single small gradient step had changed
was mostly undone before the next one. We didn't find a value of alpha that
kept the learning without the drift.

---

## Attempt 6: DPO (Contrastive Learning)

Direct Preference Optimisation pushes probability toward the chosen response and
away from the rejected ones. Instead of just reinforcing the winner, actively
suppress the losers:

```
loss = -log(sigmoid(beta * (log_pi_chosen - log_pi_rejected)))
```

When the model prefers the rejected response, the gradient is large. When it
already prefers the chosen one, the gradient is small. Self-correcting.

We implemented this and ran it. The logged margins were all approximately 0.00:

```
margin: 0.00 | loss: 0.69  (= -log(0.5), the uninformative case)
margin: 0.00 | loss: 0.69
margin: 0.01 | loss: 0.69
```

The zero margins had a known cause: we were computing the reference
log-probabilities from the current model instead of from a frozen copy, so
the margin `beta * ((log_pi_c - ref_c) - (log_pi_r - ref_r))` was always about
zero, and the loss sat at log 2.

That does not mean DPO was doing nothing. At zero margin the gradient of the
DPO loss is `beta * sigmoid(0) = 0.5 * beta` times the difference between the
chosen and rejected log-probability gradients, which is non-zero. With the
reference treated as a constant, the update is a plain contrastive step with a
fixed weight. With gradients flowing through the reference as well, the two
terms would cancel and the update would be zero. We didn't check which of these
our implementation did, so we can't say whether this version trained at all.

We replaced it with a simplified contrastive loss that uses anchor pull as
regularisation instead of a reference model, and confirmed its gradients were
non-zero.

The model still degraded. Since the corrected version failed the same way, the
reference bug probably wasn't the main reason DPO didn't help, but we didn't
establish the real reason.

---

## Attempt 7: Batch Gradient Accumulation

Instead of updating after every turn, accumulate gradients across all five turns
in a conversation, then do one combined update. This should average out the noise
from individual responses:

```
For each turn in the conversation:
  - forward pass on chosen response (accumulate grad)
  - forward pass on rejected response (accumulate grad, negative)
After all five turns:
  - one Adam step
  - anchor pull back toward the book-trained weights
```

The batch updates were smoother. The model learned "I live in a computer" at one
point. Then, the very next conversation, it had forgotten:

```
Conversation 8:
  > where do you live?
  I live in a computer .              ← learned it

Conversation 9:
  > where do you live?
  I am a language model .             ← forgot it
```

One batch update later. Gone.

---

## Attempt 8: Everything Combined

We ran batch contrastive updates with anchor pull, Adam state loaded from
the book checkpoint, loss threshold at 1.5, learning rate 1e-5, four repeats
on easy responses. Every trick at once.

Same result. Brief learning, then degradation.

---

## Why It Broke (a Hypothesis)

We didn't run the experiments needed to prove why, so this section is our best
explanation rather than a finding.

Our hypothesis is gradient noise from batch size 1. A gradient computed from one
short response — say, "Hello . What can I help you with ?" — is a very noisy
estimate of the direction that would improve the model in general. Part of it
points toward "say this in this context"; much of it is specific to that one
example, and moves weights that the model's other behaviour depends on. With a
batch of many examples, the shared part adds up while the example-specific
parts partly cancel: for independent examples, the noise in the averaged
gradient shrinks roughly as one over the square root of the batch size. With
one example, nothing cancels, and each step carries all of that noise into the
whole network.

Why would this be worse at 49M than at 10M? We don't know for certain. One
possibility is that a larger, better-trained model has more learned behaviour
for each noisy step to disturb, and a book-trained model at loss 0.28 sits in a
narrow spot that small random-looking moves easily push it out of. We didn't
measure gradient noise at either size, so this is a guess, and it's worth
remembering that RL at 10M [didn't work well either](/mr-classic-learns-to-read/).

What we can say is that the methods that do work use large batches. InstructGPT's
PPO stage used batches of hundreds of responses per update, and DeepSeek's GRPO
generates a group of completions per prompt and compares them against each
other. We were doing single-example updates on a 49M model, which is far from
any setting where RL fine-tuning is known to work.

---

## What Big Models Actually Do

| Method | Examples per update | Model Size |
|--------|-----------|-----------|
| InstructGPT (PPO) | hundreds | 1.3B-175B |
| DeepSeek-R1 (GRPO) | many prompts, a group of completions each | 671B |
| Llama 2 Chat (PPO) | 512 | 7B-70B |
| Our RL | 1 | 49M |

The gap isn't just model size. It's the engineering around the RL. Reward
models trained on tens of thousands to millions of human comparisons. Batches
of hundreds of examples averaged before each update. Tuned KL penalties against
a frozen reference model. Multiple epochs of PPO on each batch.

We had none of that. We had one human, one response at a time, live gradient
updates, and hope.

---

## What We're Doing Instead

Online RL — updating weights during the human interaction — doesn't work at
our scale. But the human interaction itself is still valuable. The human still
knows which responses are good. That judgment doesn't need to update weights
in real time.

So we separated the two:

**Interactive curation**: the model generates five candidates, the human picks
the best one or types a better response. No gradient updates. No weight changes.
The selected responses are auto-saved to the personality training file.

**Book training**: periodically, we run the personality file through the model
as supervised training. Ten epochs, loss drops to ~0.3, model absorbs the new
responses. This is ordinary supervised training with Adam and a cosine LR
schedule: still one example per step, but thousands of steps over many passes
through the whole file, rather than a handful of live updates.

```
Interactive session:
  "what is your favorite color?"  →  human types: "Blue . Like the sky ."
  (auto-saved to vidya_personality.txt)

Later:
  dune exec bin/main.exe -- --load --book vidya_personality.txt
  (3690 steps, 10 epochs, loss 0.28)

Model now knows:
  > what is your favorite color?
  Blue . Like the sky .
```

The human teaches. The model learns. Just not in real time. The gap between
selecting a response and the model knowing it is one book training session —
about 80 minutes on CPU.

This isn't as magical as watching the model learn from your keystrokes. But it
works. And "works" beats "magical but broken."

---

## What Would Fix Online RL

We didn't give up on online RL because the idea is wrong. We set it aside
because we lack the infrastructure to test it properly at 49M parameters:

**Batch size**: we need 32-256 examples per update, not 1. This means either
pre-collecting hundreds of human preferences before updating, or using automated
reward signals (verifiable rewards, reward models) to generate batch-sized
feedback without a human in the loop.

**GRPO**: DeepSeek's method generates multiple completions per prompt and uses
group statistics as the baseline. We generate 5 candidates already — we just
need to score them automatically and compute the group advantage rather than
taking one human selection and doing a gradient step.

**Reward model**: a small neural network trained on accumulated human preferences
that can rate thousands of responses per minute. This converts batch-size-1
human judgment into batch-size-256 automated judgment.

All of these are [documented and planned](/six-ways-to-teach-mr-classic-with-reinforcement-learning/).
They require more engineering. Some require a GPU for speed. None are impossible.

The lesson we take isn't "RL doesn't work on small models." It's that
single-example online updates didn't work for us at this size, and the first
thing to try next is larger batches.

---

*Vidya is written from scratch in OCaml. The source is at
[github.com/rolandnsharp/vidya](https://github.com/rolandnsharp/vidya).
See also:
[Mr . Classic](/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/),
[Six Ways to Teach Mr . Classic](/six-ways-to-teach-mr-classic-with-reinforcement-learning/),
[Growing Mr . Classic from 10M to 50M](/growing-mr-classic-from-10m-to-50m/).*

*Co-authored with [Claude](https://claude.ai/).*
