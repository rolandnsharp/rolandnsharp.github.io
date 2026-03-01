---
title: "What Ants Know About Reinforcement Learning"
date: 2026-03-02
layout: "base.njk"
tags: post
---

# What Ants Know About Reinforcement Learning

An ant has about 250,000 neurons. It finds food, optimizes paths, adapts to obstacles,
coordinates with its colony, and learns from experience. It does reinforcement learning
with a brain smaller than our language model.

It does not generate eight completions and pick the best. It does not compute group
advantages. It does not maintain a frozen reference model to prevent policy drift.

It takes one action. It gets feedback. It adjusts. And it has been doing this
successfully for 100 million years.

---

## How the Big Labs Do RL

The most important RL result in language models is DeepSeek-R1. Their algorithm, GRPO
(Group Relative Policy Optimization), works like this:

```
For each prompt:
  1. Generate 8-64 completions
  2. Score each completion (did it get the right answer?)
  3. Compute the group mean and standard deviation
  4. Completions above the mean get reinforced
  5. Completions below the mean get suppressed
  6. Clip the update to prevent instability
```

This is powerful. It produced emergent reasoning — self-reflection, self-verification,
extended thinking — in a 671-billion parameter model. It is the algorithm behind the
most impressive RL result in the history of language models.

It is also designed for a datacenter. Eight to sixty-four completions per prompt means
eight to sixty-four forward passes before a single learning step. At scale, that is
fine — you have thousands of GPUs running in parallel. For a single person teaching
a single model on a single GPU, it is wasteful. You generate eight responses, the
human reads all eight, picks one, and seven responses are thrown away. That is not
how teaching works.

We [outlined six RL approaches](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/)
for Vidya, with GRPO at the top of the list. But there is a simpler approach — one
that Sutton described decades before DeepSeek existed, one that works at any model
size, and one that is much closer to how animals actually learn.

---

## How an Ant Learns

An ant does not A/B test its decisions. It does not generate eight possible paths and
compare them. It does something simpler:

1. **Act.** Turn left, turn right, follow the pheromone, pick up the food.
2. **Mark.** The neurons that fired to produce that action are chemically marked —
   they become temporarily more sensitive to change. This is the eligibility trace.
3. **Wait.** The ant keeps acting. The marks fade with time.
4. **Reward.** The ant finds food, or reaches the nest, or encounters danger.
5. **Update.** When reward arrives, every marked neuron gets adjusted. Neurons that
   fired recently (strong marks) change a lot. Neurons that fired a while ago (faded
   marks) change a little. Neurons that did not fire (no mark) do not change at all.

This is temporal-difference learning with eligibility traces — TD(λ) — described by
Richard Sutton in the 1980s. The mathematics:

```
trace(i) = trace(i) * γ * λ + grad(i)    decay old traces, mark new activity
δ = reward - baseline                      how surprising was this outcome?
param(i) += α * δ * trace(i)              update proportional to trace
```

Three lines. Every parameter carries a trace — a fading memory of how much it
contributed to recent actions. When reward arrives, the surprise (δ) is distributed
across all parameters in proportion to their trace. Parameters that just fired get
most of the credit. Parameters that fired ten steps ago get a little credit.
Parameters that have been quiet get none.

The trace does what GRPO does with group comparison — it figures out which parts of
the model are responsible for the outcome. But it does it continuously, with a single
action at a time, not in batches of eight.

---

## Why This Fits Vidya

Vidya is not a datacenter model trained on millions of prompts in parallel. It is a
[personal model](/posts/a-model-for-life/) taught by one human in real time. The
teaching experience looks like this:

```
Human types a prompt
Model generates a response, one token at a time
Human reads the response
Human says "good" or "no, that is wrong" or corrects a word mid-sentence
Model learns from the feedback
Repeat
```

This is a single stream of experience. One action (token) at a time. One reward signal
(human feedback) at unpredictable intervals. Exactly the setting Sutton's algorithms
were designed for.

TD(λ) with eligibility traces fits this perfectly:

```
Each token generated:
  → trace every parameter's contribution (how much did it push toward this token?)
  → traces from previous tokens decay by γλ

Human gives feedback:
  → compute TD error (was this better or worse than expected?)
  → update every parameter proportional to its trace
  → parameters that produced recent tokens change most
  → parameters that produced earlier tokens change a little
  → the credit assignment is automatic
```

When the human says "no, stop" mid-sentence, the traces know which parameters to
blame — the ones that fired on the last few tokens. When the human says "that whole
response was good" at the end, the traces distribute credit across the entire
response, with more credit to the ending and less to the opening.

No batch of completions. No group statistics. No wasted generations. One action, one
trace update, one reward, one learning step. The model learns from every token it
generates, not just from the response the human selected.

---

## GRPO vs TD(λ)

The two approaches serve different purposes:

| | GRPO | TD(λ) with traces |
|---|---|---|
| Actions per step | 8-64 completions | 1 token |
| Forward passes | 8-64 per prompt | 1 per token |
| Reward timing | End of generation | Any time |
| Credit assignment | Group comparison | Temporal decay |
| Memory | All completions stored | One trace vector |
| Learning signal | Which completion was best | How surprising was the outcome |
| Designed for | Clusters, batch training | Single agent, streaming experience |
| Biological analog | None | Dopamine + synaptic plasticity |
| Feels like | A/B testing | Teaching |

GRPO is better for automated training on verifiable tasks — math problems, code
generation, format compliance — where you can generate many answers and check them
mechanically. It does not need a human. It scales with compute.

TD(λ) is better for interactive teaching — the human sitting with the model, talking
to it, correcting it, shaping it over time. It learns from every moment of
interaction, not just from selected responses. It scales with experience.

Both have a place in Vidya. We described
[six approaches](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/)
to RL for a reason — different methods for different kinds of learning. GRPO for the
overnight batch runs on math problems. TD(λ) for the afternoon sessions where the
human teaches taste.

---

## The Scale Argument

The smallest model where GRPO has produced published results is 135 million parameters.
The smallest where reasoning emerged is 1.5 billion. The conventional wisdom is that
RL needs large models with spare capacity — enough "slack" in the parameters for the
algorithm to discover new behaviors.

But TD(λ) does not need spare capacity. It does not discover new behaviors. It
adjusts existing ones. When reward arrives, it strengthens the pathways that were
active. When punishment arrives, it weakens them. This is not exploration — it is
refinement. The model already knows how to generate language. The traces just tell it
which parts of its existing knowledge to emphasize.

This is how an ant learns. An ant does not have spare capacity. Every one of its
250,000 neurons is working hard just to navigate and survive. There is no "slack" for
the RL algorithm to explore. Instead, the ant refines what it already does — turn more
often toward the pheromone trail, avoid the area where the predator appeared, prefer
the shorter path. Small adjustments to existing behaviors, guided by traces that fade
over time.

A 135-million parameter model trained on millions of conversations has the same
character. It already knows language. It already generates coherent responses. RL does
not need to discover language from scratch — it needs to nudge the model toward the
owner's preferences, one token at a time, through thousands of small adjustments.

The ant says: you do not need to be big. You need to pay attention, act, and learn
from what happens.

---

## The Implementation

TD(λ) with eligibility traces for a language model is surprisingly simple. The core
loop:

```
initialize:
  traces = zeros(n_params)       one trace per parameter
  baseline = running_average     of recent rewards

each token generated:
  logits = forward(model, context)
  token = sample(logits)
  grads = d_log_prob(token) / d_params   policy gradient for this token
  traces = traces * γ * λ + grads        decay and accumulate

when reward arrives:
  δ = reward - baseline                  TD error
  for each parameter:
    param += α * δ * trace              update proportional to trace
  baseline = baseline * 0.99 + reward * 0.01   update baseline
  traces = zeros(n_params)               reset after reward
```

The trace vector is the same size as the parameter vector — for a 135M model, that is
135 million floats, about 1 GB. Not nothing, but manageable on a GPU with 12 GB of
VRAM. The trace update is one multiply-and-add per parameter per token — the same
cost as one gradient accumulation step.

The hyperparameters:

| Parameter | Meaning | Starting value |
|---|---|---|
| γ (gamma) | How much future reward matters | 0.99 |
| λ (lambda) | How fast traces decay | 0.95 |
| α (alpha) | Learning rate | 1e-5 |

γλ together control the trace decay. At 0.99 × 0.95 = 0.94 per token, a trace
retains about 50% of its strength after 12 tokens and 10% after 38 tokens. For a
response of 50-100 tokens, early tokens still get some credit but recent tokens get
most of it. This matches intuition — if the response went wrong, it probably went
wrong recently.

---

## What Sutton Knew

Richard Sutton has spent forty years arguing that simple, general methods — methods
that leverage computation rather than human knowledge — ultimately win. This is the
Bitter Lesson. But there is a corollary that gets less attention:

**Simple methods also work at simple scales.**

TD(λ) was designed for problems that look exactly like Vidya's: one agent, one
environment, a stream of actions and rewards, limited compute, no batch processing.
The algorithm was published in 1988. It has been tested on everything from board games
to robotic control to animal conditioning models. It works at scales from a hundred
parameters to a billion.

The big labs skipped TD(λ) because they have different problems — millions of prompts,
thousands of GPUs, batch efficiency matters more than sample efficiency. GRPO and PPO
are batch algorithms for batch infrastructure. They are not better algorithms. They are
algorithms for a different situation.

Our situation is one human, one model, one GPU, one conversation at a time. That is
Sutton's situation. The algorithm he designed for it still works.

---

## The Ant and the Model

The ant does not understand neuroscience. It does not know that its synapses carry
eligibility traces or that its behavior is shaped by temporal-difference learning. It
just acts, gets feedback, and adjusts. The learning is invisible — woven into the
machinery, happening with every step.

That is what we want for Vidya. Not training sessions where the human sits down to
formally teach the model. Not batches of completions to compare. Just conversation —
natural, ongoing, continuous — where the model gets a little better with every
exchange. The traces run in the background. The learning happens automatically. Over
thousands of conversations, the model drifts toward its owner, shaped by nothing more
than which tokens led to good outcomes and which did not.

The ant has been doing this for 100 million years with 250,000 neurons.

We have 135 million parameters and a
[lifetime to learn](/posts/a-model-for-life/).

---

*See also:
[Six Ways to Teach Mr. Classic](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/),
[A Model for Life](/posts/a-model-for-life/),
[Reinforcement Learning: From Sutton's Foundations to Vidya](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/).*

*Co-authored with [Claude](https://claude.ai/).*
