---
title: "Why Reinforcement Learning Broke at 50M Parameters"
date: 2026-03-03
layout: "base.njk"
tags: post
---

# Why Reinforcement Learning Broke at 50M Parameters

In the [first RL post](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/),
we described a simple method: generate five responses, human picks the best one,
update the weights. At 10 million parameters, it worked. The model learned from
the human. Responses got better. You could feel it.

Then we [grew Mr . Classic to 49M parameters](/posts/growing-mr-classic-from-10m-to-50m/).
The same RL method stopped working. Not "worked slowly." Stopped. Every attempt
to teach the model online made it worse. We tried eight different approaches over
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

## Attempt 5: Elastic Weight Consolidation

After each RL step, pull the weights back toward their book-trained values:

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

This is a simplified version of what big models do with KL penalties in RLHF —
prevent the model from drifting too far from its base. Alpha of 0.01 gives a
gentle pull, 0.1 a strong one.

With elastic pull at 0.02, the model was more stable. It stopped collapsing
entirely. But it also stopped learning. The pull was strong enough to undo what
the gradient step had just done. Every RL step was fighting the elastic pull,
and the pull always won because it operated on all 49M parameters simultaneously
while the gradient signal only touched a few thousand.

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

We implemented this and ran it. The margins were all approximately 0.00:

```
margin: 0.00 | loss: 0.69  (= -log(0.5), the uninformative case)
margin: 0.00 | loss: 0.69
margin: 0.01 | loss: 0.69
```

After debugging, the problem was architectural: we were computing the reference
log-probabilities from the current model instead of from a frozen anchor. This
made the margin `beta * ((log_pi - ref) - (log_pi - ref))` which is always
approximately zero. DPO was doing nothing.

We fixed it with a simplified contrastive loss that uses elastic pull as
regularisation instead of a reference model. The contrastive gradients were
now non-zero.

The model still degraded.

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
  - elastic pull back toward anchor
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

We ran batch contrastive updates with elastic pull, Adam state loaded from
the book checkpoint, loss threshold at 1.5, learning rate 1e-5, four repeats
on easy responses. Every trick at once.

Same result. Brief learning, then degradation.

---

## Why It Broke

The fundamental problem is signal-to-noise ratio.

A gradient step from a single short response — say, "Hello . What can I help
you with ?" — produces a gradient vector with 49 million components. A few
thousand of those components carry useful signal: the weights that produced
those specific tokens in that specific context. The other 49 million minus a
few thousand carry noise: random gradient values from the forward pass through
twelve transformer layers.

At 10M parameters, the ratio was tolerable. The useful gradient signal from 10
tokens spread across 10M weights was concentrated enough to move the right
weights more than the wrong ones. At 49M, the same 10-token signal is spread
across 5x more weights. The signal doesn't change — it's the same 10 tokens —
but the noise floor is 5x higher.

This is why it works at 10M and fails at 49M. Not because the algorithm is
wrong. Not because the learning rate is wrong. The signal-to-noise ratio of
single-example gradient updates doesn't scale.

Big models solve this with batch sizes. OpenAI's RLHF uses batches of 256+
responses per update. DeepSeek's GRPO generates 8-64 completions per prompt and
computes group statistics. The batch averages out the noise and amplifies the
signal. One example into 49M parameters is noise. 256 examples into 175B
parameters is signal — because the 256 gradients are correlated (they all point
toward "better responses") while the noise is uncorrelated (it cancels out).

We were doing batch size 1 into 49M parameters. That's not RL. That's random
perturbation with extra steps.

---

## What Big Models Actually Do

| Method | Batch Size | Model Size | Training Steps |
|--------|-----------|-----------|----------------|
| InstructGPT (PPO) | 256-512 | 1.3B-175B | ~100K |
| DeepSeek-R1 (GRPO) | 8-64 per prompt | 671B | ~10K |
| Llama 2 Chat (PPO) | 512 | 7B-70B | ~200K |
| Our RL | 1 | 49M | 5-50 |

The gap isn't just model size. It's the engineering around the RL. A reward
model trained on 100K human preferences. Batches of hundreds of examples
averaged before each update. KL penalties calibrated over thousands of steps.
Reference models frozen and compared at every step. Multiple epochs of PPO
on each batch.

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
responses. This uses full-batch training with Adam, cosine LR schedule,
thousands of gradient steps — proper training, not single-example noise.

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

We didn't give up on online RL because the idea is wrong. We gave up because we
lack the infrastructure to make it work at 49M parameters:

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

All of these are [documented and planned](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/).
They require more engineering. Some require a GPU for speed. None are impossible.

The lesson isn't "RL doesn't work on small models." It's "single-example RL
doesn't work on models with more parameters than examples." Fix the ratio, fix
the RL.

---

*Vidya is written from scratch in OCaml. The source is at
[github.com/rolandnsharp/vidya](https://github.com/rolandnsharp/vidya).
See also:
[Mr . Classic](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/),
[Six Ways to Teach Mr . Classic](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/),
[Growing Mr . Classic from 10M to 50M](/posts/growing-mr-classic-from-10m-to-50m/).*

*Co-authored with [Claude](https://claude.ai/).*
