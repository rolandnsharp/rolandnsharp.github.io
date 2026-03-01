---
title: "Two Paths to Reinforcement Learning"
date: 2026-03-02
layout: "base.njk"
tags: post
---

# Two Paths to Reinforcement Learning

We have been going back and forth on how to build RL into Vidya. Not which algorithm
— we [covered six of those](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/)
already. The question is deeper: **how does the RL code relate to the neural network
code?**

There are two architectures, and they lead to different kinds of software, different
kinds of flexibility, and different ways of thinking about what the model is.

---

## Path A: The Neural Network Is the RL

This is the modern approach. DeepSeek uses it. OpenAI uses it. The entire RLHF
pipeline assumes it. The neural network is not a component inside an RL system — it
*is* the RL system. Policy, value function, reward model — they are all neural
networks, trained end-to-end, with no abstraction between them.

The code is direct:

```
completions = generate(model, prompt, 8)
rewards = score(completions)
advantages = normalize(rewards)
updatePolicy(model, completions, advantages)
```

Four lines. The model generates, the reward function scores, the optimizer updates.
There is no "state" object, no "action" type, no "environment" interface. The prompt
is the state. The tokens are the actions. The human is the environment. The concepts
exist but they are not represented in the code — they are implicit in the data flow.

**Advantages:**

- **Simple.** The code is short and obvious. No abstractions to learn, no interfaces
  to satisfy, no indirection to trace through.
- **Fast to build.** You can have GRPO running in an afternoon. The distance between
  "I understand the algorithm" and "it is training" is small.
- **Proven at scale.** This is how every major RL result in language models has been
  achieved. DeepSeek-R1, InstructGPT, Claude, Gemini — all of them treat the neural
  network as the policy directly.

**Disadvantages:**

- **Locked to one algorithm.** Switching from GRPO to TD(λ) means rewriting the
  training loop. The RL logic is tangled with the model code — you cannot swap one
  without touching the other.
- **No temporal structure.** GRPO treats each prompt independently. There is no
  concept of state transitions, no credit assignment across conversation turns, no
  value function that estimates the long-term quality of a conversation. Each
  generation is scored in isolation.
- **Hard to extend.** Adding eligibility traces, a value function, planning, or
  curiosity-driven exploration means bolting new systems onto a codebase that was
  not designed for them. Each addition is a special case.

This path is fast to start and hard to grow.

---

## Path B: Sutton's Framework

Richard Sutton spent forty years developing a framework for reinforcement learning
that separates the agent from the environment, the policy from the value function,
and the learning algorithm from the function approximator. The core abstraction:

```
Agent:
  state    → what the agent observes
  action   → what the agent does
  policy   → how the agent chooses actions given a state
  value    → how good the agent thinks a state is
  traces   → which parameters contributed to recent actions

Environment:
  step(action) → next_state, reward
```

The neural network is not the RL system. It is a **function approximator** — one
component inside the RL system. The policy uses the neural network to choose actions.
The value function might use a separate neural network (or a simple linear model, or
a lookup table) to estimate how good the current state is. The learning algorithm
operates on the abstractions — states, actions, rewards, traces — and updates the
function approximator through them.

```
// The RL system
state = encode(conversation)
action = policy.choose(state)          // policy uses the NN internally
reward = environment.step(action)      // human reacts
delta = reward - value.estimate(state) // TD error
traces.update(policy.gradients())      // mark what fired
policy.learn(delta, traces)            // update the NN through the abstraction
value.learn(delta, state)              // update the value estimate
```

More lines. More concepts. But each concept is isolated and replaceable.

**Advantages:**

- **Swappable algorithms.** The policy, the value function, and the learning rule are
  separate components. Switch from GRPO to TD(λ) by changing the learning rule. Add a
  value function without touching the policy. Replace the neural network with a larger
  one without changing the RL logic.
- **Temporal structure.** States, transitions, and traces are first-class concepts. The
  system naturally supports credit assignment across conversation turns — turn 3 gets
  partial credit for the good outcome at turn 7, because the traces carry the memory.
- **Value functions.** The agent can estimate how good a conversation is going before
  it ends. This enables planning — the model can reason about which response will lead
  to a better conversation, not just which response looks good right now.
- **Principled exploration.** With a value function and uncertainty estimates, the model
  can decide when to try something new versus when to stick with what works. UCB,
  Thompson sampling, curiosity-driven exploration — all of these plug into the framework
  naturally.
- **Testable in isolation.** Test the RL logic with a simple environment (gridworld,
  bandit) before connecting it to the neural network. If the RL works on a toy problem,
  the wiring to the NN is the only thing that can go wrong.

**Disadvantages:**

- **More code upfront.** The abstractions have to be designed, built, and tested before
  they do anything useful. The distance between "I understand the algorithm" and "it is
  training" is longer.
- **Indirection cost.** Every action goes through a policy interface, every reward goes
  through a value estimate, every update goes through a trace. More layers between you
  and the numbers. When debugging, you have to trace through abstractions instead of
  reading the math directly.
- **Nobody does this for LLMs.** The entire industry uses Path A. There are no reference
  implementations of Sutton-style RL for language model training. We would be building
  something novel.

This path is slow to start and easy to grow.

---

## The Contradiction

In the [last post](/posts/what-ants-know-about-reinforcement-learning/), we argued that
TD(λ) with eligibility traces is the natural algorithm for Vidya — one action at a time,
temporal credit assignment, continuous learning from a single stream of experience.

But TD(λ) is a Path B algorithm. It needs states, transitions, value estimates, and
traces. Running TD(λ) without the Sutton framework means cramming temporal structure
into a codebase that has no concept of time. The traces have to live somewhere. The
value baseline has to live somewhere. The state representation has to live somewhere.

GRPO works cleanly on Path A because it has no temporal structure — each prompt is
independent. TD(λ) works cleanly on Path B because it is fundamentally about temporal
structure — each token depends on what came before.

**If we choose TD(λ), we are choosing Path B.** The algorithm demands the architecture.

---

## What an Ant Actually Has

An ant does not have a clean software architecture. Its neurons are a tangled mess of
connections shaped by evolution. But the *functional* structure maps to Sutton's
framework remarkably well:

| Sutton concept | Ant equivalent | Vidya equivalent |
|---|---|---|
| State | Sensory input (pheromones, light, touch) | Conversation context (token sequence) |
| Action | Motor output (turn, walk, pick up) | Next token |
| Policy | Sensory-motor mapping (neurons) | Transformer forward pass |
| Value | Anticipated reward (learned association) | Baseline estimate |
| Traces | Synaptic eligibility (chemical markers) | Per-parameter trace vector |
| Reward | Food, nest, danger (dopamine analog) | Human feedback |
| TD error | Reward prediction error (dopamine burst) | reward - baseline |

The ant has all of Sutton's components. They are not cleanly separated in its brain —
but they are functionally distinct. The sensory processing (state encoding) is separate
from the motor output (action selection). The dopamine signal (reward) is separate from
the synaptic traces (credit assignment). Evolution built the abstraction without the
software engineering.

We have the luxury of building it deliberately. The question is whether the
deliberate structure helps or hurts.

---

## Beyond "Pick the Best Response"

Both paths share a problem with the five-response selection method: it only works when
responses are short. Pick the best one-liner from five options — easy. Pick the best
paragraph from five paragraphs — tedious. Pick the best conversation from five
conversations — impossible.

A model for life cannot learn only through formal evaluation sessions. It needs to
learn from conversation itself — from the human's words, from corrections, from the
flow of interaction. Both paths support this, but differently.

**Learning from your words.** The simplest channel. When the human types a message,
that is training data. The model does a small gradient step to predict the human's
words better. No scoring, no selection — just: "the human said this, learn from it."
Works at any length. Works in both paths.

**Learning from corrections.** When the human says "no, actually it is X," the model
has two signals: its own response (bad) and the correction (good). One negative
gradient step on what it said, one positive step on what the human said. No need to
pick from five. Works in both paths.

**Learning from continued conversation.** If the human keeps talking, the model was
probably fine. If the human corrects, it was wrong. If the human leaves, it was boring.
These are weak signals but they are free and continuous. Works in both paths — but
differently.

This is where the paths diverge:

| Signal | Path A | Path B (with traces) |
|---|---|---|
| Correction at token 50 | Updates the whole response equally | Tokens 45-50 get most blame, token 10 gets almost none |
| Human keeps talking | Rewards the whole response equally | Recent tokens get most credit |
| "That last part was wrong" | Cannot isolate "last part" | Traces know which parameters fired recently |

Path A treats every token in a response as equally responsible. Path B knows *when*
things happened — the traces carry a fading memory of which parameters contributed to
which tokens.

The question is whether that precision matters. If the model says something wrong and
the human corrects it, nudging the whole response with a small negative step might be
good enough. The model drifts away from that kind of response. It does not need to
know that token 47 was the specific problem.

But if the model keeps making the same mistake in the middle of otherwise good
responses — if the beginning is always fine and the ending always goes wrong — then
whole-response updates cannot fix it. Only temporal credit assignment can isolate the
pattern.

---

## The Decision

The goal is not to give Sutton's ideas a place to live. The goal is the most capable
personal AI that grows and learns with its owner over a lifetime.

Start simple. The three learning channels that do not require any framework:

1. **Learn from the human's words** — supervised, tiny learning rate, every conversation
2. **Learn from corrections** — contrastive, wrong response down, correction up
3. **Pick from N responses** — when responses are short enough to compare

These work on Path A. No traces, no value functions, no abstractions. Start teaching
the model immediately.

If after months of teaching, the model shows a pattern — good beginnings, bad endings,
or vice versa — that whole-response updates cannot fix, add eligibility traces. That
is one array and a few lines of update logic. Not a framework. Just a tool for a
specific problem.

If the model needs to plan ahead — choosing responses that lead to better conversations
rather than just good individual turns — add a value function. That is a linear layer
on the hidden state. Not a framework. Just a tool for a specific problem.

Build what solves the problem in front of you. The framework emerges from the problems,
not the other way around. The ant did not design its architecture. It evolved toward
whatever worked. We should do the same — start simple, add complexity when the simple
approach fails, and let the system grow from experience rather than from theory.

---

## The Implementation

What we build on day one:

```
learn.js:
  learnFromHuman(model, humanTokens)
    // tiny supervised step on the human's words
    // lr = 1e-6, accumulates over thousands of conversations

  learnFromCorrection(model, badResponse, correction)
    // negative step on badResponse
    // positive step on correction
    // lr = 1e-5, stronger signal

  learnFromSelection(model, candidates, selectedIndex)
    // positive step on selected, negative on rejected
    // the original bandit method, for short responses

  // future, if needed:
  learnWithTraces(model, traces, reward)
    // TD(λ) update proportional to eligibility traces
    // add when whole-response updates are not precise enough
```

One file. No framework. Each function is independent — use whichever channels make
sense for the current interaction. Add new channels when you need them. The neural
network stays clean. The learning stays simple.

---

*See also:
[What Ants Know About Reinforcement Learning](/posts/what-ants-know-about-reinforcement-learning/),
[Six Ways to Teach Mr. Classic](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/),
[A Model for Life](/posts/a-model-for-life/).*

*Co-authored with [Claude](https://claude.ai/).*
