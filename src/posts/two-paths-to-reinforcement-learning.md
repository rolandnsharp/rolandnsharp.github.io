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

## The Decision

Here is what each path looks like for Vidya over the next year:

**Path A (direct, GRPO-first):**

```
Month 1:  GRPO on verifiable rewards (math, format). Works fast.
Month 2:  Human-in-the-loop selection (pick best of 5). Works fast.
Month 3:  Want to add credit assignment across turns. Awkward.
Month 4:  Want to add a value function. Bolted on.
Month 5:  Want continuous learning from conversation. Major rewrite.
Month 6:  Realize we are building Path B anyway, but messily.
```

**Path B (Sutton framework, TD(λ)-first):**

```
Month 1:  Build the framework. Define state, action, policy, value, traces.
          Test with a toy problem (bandit, gridworld). No model training yet.
Month 2:  Connect to the neural network. TD(λ) with traces on real conversations.
Month 3:  Add GRPO as a second learning rule. Plugs in cleanly.
Month 4:  Add a value function. Plugs in cleanly.
Month 5:  Add curiosity-driven exploration. Plugs in cleanly.
Month 6:  Everything composes. Each new method is a module, not a rewrite.
```

Path A is faster for the first month and slower for every month after. Path B is
slower for the first month and faster for every month after. For a project measured in
years, not months, the upfront cost of Path B is noise.

---

## Our Choice

We are building Path B.

Not because it is theoretically elegant — though it is. Because Vidya is a
[model for life](/posts/a-model-for-life/). It will learn from
[many channels](/posts/a-model-for-life/) — human selection, automated
rewards, book training, online conversation learning, corrections in context. Each
of these is a different reward signal, a different environment, a different learning
rule. They all need to compose.

Path A works for one algorithm applied to one reward signal. Path B works for many
algorithms applied to many reward signals, accumulated over years. Vidya is not a
model that gets trained once. It is a model that keeps learning, from everything,
forever.

Sutton's framework was designed for exactly this: an agent that learns continuously
from a stream of experience, with multiple sources of reward, over an indefinite
lifetime. We did not need to invent something new. We needed to implement something
old.

The ant has been running Path B for 100 million years. It works.

---

## The Implementation

The Sutton framework for Vidya, in concrete terms:

```
agent.js:
  state     = tokenize(conversation)
  policy    = transformer forward pass → token probabilities
  value     = linear layer on last hidden state → scalar
  traces    = Float64Array(n_params), decays by γλ per token
  baseline  = running average of recent rewards

environment.js:
  step(token) → appends to conversation, optionally returns reward
  reward sources:
    - human feedback (explicit: "good" / "bad" / typed correction)
    - verification (automated: did the math check out?)
    - conversation signal (implicit: did the human keep talking?)

learner.js:
  td_lambda:  traces + TD error → parameter updates
  grpo:       batch completions + group comparison → parameter updates
  bandit:     selection from N candidates → parameter updates
  (all implement the same interface: observe reward, update policy)
```

Three files. Each replaceable. Each testable independently. The neural network knows
nothing about RL — it just maps tokens to probabilities. The RL system knows nothing
about transformers — it just updates parameters through traces and gradients. The
environment knows nothing about either — it just provides states and rewards.

We test the learner on a multi-armed bandit. We test the environment with a dummy
policy. We test the policy with known inputs. When all three work independently, we
connect them. If something breaks, we know which component to blame.

This is how Sutton builds RL systems. This is how we will build ours.

---

*See also:
[What Ants Know About Reinforcement Learning](/posts/what-ants-know-about-reinforcement-learning/),
[Six Ways to Teach Mr. Classic](/posts/six-ways-to-teach-mr-classic-with-reinforcement-learning/),
[A Model for Life](/posts/a-model-for-life/).*

*Co-authored with [Claude](https://claude.ai/).*
