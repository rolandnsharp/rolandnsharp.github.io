---
title: "Six Ways to Teach Mr. Classic with Reinforcement Learning"
date: 2026-02-28
layout: "base.njk"
tags: post
---

# Six Ways to Teach Mr. Classic with Reinforcement Learning

We've been [teaching Mr. Classic with human-in-the-loop RL](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/) —
generate five responses, pick the best one, update the weights. It works. The model
gets better. And it feels like something — you can feel the model learning from you,
shifting toward your preferences, becoming more *yours* with every interaction.

We don't want to replace that. The experience of teaching your own model is the
whole point. When you pick response 3 and the next batch is noticeably better, that's
not a bottleneck — that's the product. A model that learns from its owner, that
carries the shape of a specific person's judgment, that gets better because *you*
taught it. That's what we're building.

But there are things the human can't teach efficiently. Mathematical correctness.
Factual accuracy. Reasoning chains. Format compliance. And there are hours when the
human isn't sitting at the keyboard but the model could still be learning. The six
approaches below aren't replacements for human-in-the-loop RL — they're companions
to it. The human teaches taste. The automated systems teach skill.

This post is a research journal — notes on six approaches to RL that we want to
apply to Vidya, from the simplest to the most ambitious. Some are proven at scale
by DeepSeek and OpenAI. Some are uncharted territory at our model size. All of them
are implementable in our OCaml framework without PyTorch.

---

## Where We Are

Vidya's current RL is a multi-armed bandit with human feedback:

```
1. Present a prompt
2. Generate 5 responses
3. Human picks the best (or types a better one)
4. Policy gradient update
5. Repeat
```

This is [Sutton's gradient bandit](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/)
applied to language generation. Actions that beat the baseline get reinforced. Actions
below it get suppressed. The human is the reward function.

This stays. It's the core of Vidya's training experience and we have no intention of
removing it. But the human is best at teaching *judgment* — style, tone, what makes a
response feel right. The six approaches below handle what the human shouldn't have to
teach: mechanical correctness, mathematical reasoning, format compliance. The human
teaches taste. The machine teaches skill.

---

## 1. Automated Reward Signals

The simplest upgrade: find tasks where the environment itself provides the reward.

A math problem has a correct answer. A code snippet either runs or doesn't. A factual
question either matches ground truth or it doesn't. No human needed — the verification
is mechanical.

```
Prompt:    "What is 7 x 8?"
Response:  "The answer is 56."
Reward:    1.0 (correct)

Prompt:    "What is 7 x 8?"
Response:  "The answer is 54."
Reward:    0.0 (wrong)
```

This is what DeepSeek calls **Reinforcement Learning with Verifiable Rewards (RLVR)**.
The key insight: you don't need a neural reward model if you can write a function that
checks the answer. A regex that extracts a number and compares it to ground truth is
a reward model — a perfect one, with zero training cost.

Datasets that provide automatic verification:

| Dataset | Size | Domain | Verification |
|---------|------|--------|-------------|
| GSM8K | 8,500 | Grade school math | Extract number, compare |
| MATH | 12,500 | Competition math | Symbolic match |
| HumanEval | 164 | Code generation | Run test cases |
| MBPP | 974 | Code generation | Run test cases |
| TriviaQA | 95,000 | General knowledge | String match |

For Mr. Classic at 49M parameters, GSM8K is the obvious starting point. Grade school
arithmetic. Clear right/wrong signal. Small enough to iterate quickly.

The open question: can a 49M parameter model learn to do arithmetic from reward alone?
The smallest model where this has been demonstrated is 135M (SmolLM on syllogistic
reasoning). We're 3x smaller. It might not work. But the experiment costs nothing —
generate, check, update.

---

## 2. GRPO: What Made DeepSeek-R1 Work

Group Relative Policy Optimization is the algorithm behind DeepSeek-R1's reasoning
capabilities. It's surprisingly simple, and it's the most important development in RL
for language models since RLHF.

Standard RLHF (what OpenAI used for InstructGPT) requires four models running
simultaneously:

```
PPO setup (4 models):
  1. Policy model      — the model being trained
  2. Critic model      — estimates how good each state is
  3. Reference model   — frozen copy to prevent drift
  4. Reward model      — scores outputs

Memory: ~4x the model size
```

GRPO eliminates the critic entirely. Instead of training a separate network to
estimate value, it generates multiple completions per prompt and uses the group
statistics as the baseline:

```
GRPO setup (3 models, or 2 with verifiable rewards):
  1. Policy model      — the model being trained
  2. Reference model   — frozen copy to prevent drift
  3. Reward function   — can be a simple verification function

Memory: ~2x the model size
```

The algorithm:

**Step 1.** For each prompt, generate a group of completions (8-64):

```
Prompt: "What is 15 + 28?"

Completion 1: "The answer is 43."     → reward 1.0
Completion 2: "Let me think... 42."   → reward 0.0
Completion 3: "15 + 28 = 43."        → reward 1.0
Completion 4: "It's 44."             → reward 0.0
...
```

**Step 2.** Compute advantage by comparing each completion to the group average:

```
Group mean reward: 0.5
Group std: 0.5

Completion 1 advantage: (1.0 - 0.5) / 0.5 = +1.0  (above average)
Completion 2 advantage: (0.0 - 0.5) / 0.5 = -1.0  (below average)
```

**Step 3.** Update the policy to make above-average completions more likely and
below-average ones less likely. Clip the update to prevent instability:

```
ratio = P(completion | new policy) / P(completion | old policy)
loss = min(ratio * advantage, clip(ratio, 0.8, 1.2) * advantage)
```

**Step 4.** Add a KL penalty to prevent the model from drifting too far from the
reference copy.

That's it. No critic to train, no per-token advantage estimation, no GAE
(Generalized Advantage Estimation). The group comparison *is* the baseline.

### What Emerged from GRPO

The remarkable thing about DeepSeek-R1 is what happened when they applied GRPO to a
base model with only correctness rewards — no supervised fine-tuning on reasoning
examples, no chain-of-thought demonstrations. The model spontaneously developed:

- **Self-reflection**: revisiting and reevaluating previous steps
- **Self-verification**: checking its own answers before concluding
- **Dynamic strategy**: trying alternative approaches when the first attempt fails
- **Extended thinking**: allocating more tokens to harder problems

At one point during training, the model wrote:

> "Wait, wait. Wait. That's an aha moment I can flag here."

The researchers commented: *"This is also an aha moment for us, allowing us to witness
the power and beauty of reinforcement learning."*

These behaviors were never taught. They emerged from a single signal: did the answer
match the ground truth?

### GRPO for Mr. Classic

At 49M parameters, we probably won't see emergent reasoning. The smallest model where
GRPO has produced reasoning gains is 1.5B — 30x our size. The DeepSeek-R1 paper found
that for small models, distillation from a large RL-trained model works better than
applying RL directly.

But GRPO doesn't require reasoning emergence to be useful. At our scale, it could:

- Improve response formatting and coherence
- Teach the model to end responses cleanly
- Optimise for specific verifiable rewards (math, format compliance)
- Replace our current human-in-the-loop bandit with automated group comparison

The algorithm is simple enough to implement in OCaml. We already have the forward
pass, softmax, and log-probability computation. We need:

1. A sampling function that generates N completions per prompt
2. A reward function (start with answer verification)
3. The advantage computation (subtract mean, divide by std)
4. A clipped policy gradient update

Maybe 200 lines of OCaml. No new dependencies.

---

## 3. Train a Reward Model

Human-in-the-loop RL doesn't scale, but the preferences it collects are valuable. Every
time we pick response 3 out of 5, that's a training signal: response 3 is better than
responses 1, 2, 4, and 5. Over thousands of selections, we build a dataset of human
preferences.

A reward model is a second neural network trained to predict those preferences. Instead
of the human rating every response, the reward model approximates the human's judgment:

```
Human rates 5,000 responses over a few afternoons
  ↓
Train reward model on those 5,000 preference pairs
  ↓
Reward model rates 500,000 responses automatically
  ↓
Use GRPO or PPO with the reward model's scores
```

This is standard RLHF — the pipeline that produced InstructGPT and ChatGPT. OpenAI
showed it works at 1.3B parameters (InstructGPT), where a 1.3B model with RLHF was
preferred by humans over the 175B base GPT-3.

For us, the reward model could be a second small transformer — even smaller than Mr.
Classic, since predicting "good vs. bad response" is an easier task than generating
language. A 5M parameter model trained on our preference data might be enough.

The risk: reward hacking. The model finds outputs that score high on the reward model
but are actually bad — exploiting patterns in the reward model's errors rather than
genuinely improving. DeepSeek deliberately avoided neural reward models for R1's
reasoning training, using verifiable rewards (approach #1) instead.

Our plan: start with verifiable rewards (approach #1) and GRPO (approach #2). Collect
human preferences along the way. Train a reward model later, when we have enough data
and want to optimise for qualities that can't be verified mechanically — like
conversational style, helpfulness, and coherence.

---

## 4. Curriculum Learning via RL

Standard training shuffles data randomly. Every conversation has equal probability of
being shown to the model at any step. But some conversations are more useful than
others at different points in training.

Early in training, simple conversations help more — short exchanges, common words,
predictable patterns. Late in training, the model needs harder material — longer
exchanges, unusual vocabulary, complex reasoning. Showing a beginner model a PhD-level
conversation wastes compute. Showing an advanced model "how are you? / I'm fine" wastes
compute.

Curriculum learning uses RL to decide what to train on next:

```
State:    the model's current capabilities (recent loss on different data types)
Action:   which batch of training data to show next
Reward:   how much the model improved from that batch
```

The RL agent learns which training examples are most useful for the current model
state. It's a meta-learning problem — learning how to learn.

This is more speculative than approaches 1-3. We haven't seen it applied to models at
our scale, and the overhead of maintaining a curriculum agent might not be worth it for
a 49M model. But it connects to something we've already observed: Mr. Classic's loss
on the 37K conversation dataset was 2.2 (memorising), while his loss on the 2.4M
dataset started at 2.8 (generalising). The model needs different data at different
stages. A curriculum agent would formalise that intuition.

---

## 5. Multi-Turn Conversation Optimisation

Our current RL rates individual responses. Human picks response 3 out of 5, that
response gets reinforced. But conversations are sequential — a mediocre response at
turn 3 might set up a brilliant response at turn 7. A flashy response at turn 1 might
derail the conversation by turn 4.

This is the classic **credit assignment problem** in RL. Which action actually caused
the good outcome? Sutton's answer is temporal-difference learning with eligibility
traces:

```
e(token) *= gamma * lambda    ; decay all traces
e(chosen_token) = 1           ; mark the chosen token
theta += alpha * delta * e    ; update proportional to trace
```

Applied to conversation:

```
Turn 1: "Hello, how can I help you?"        (neutral)
Turn 2: "Tell me about your hobbies."       (set up a good topic)
Turn 3: "That sounds fascinating, I..."     (good response)
Turn 4: "I also enjoy reading about..."     (excellent continuation)
                                             ← reward signal here

Credit assignment: Turn 2 gets partial credit for enabling turns 3-4
```

The reward comes at the end of the conversation (or at natural breakpoints). TD
learning propagates that reward backward through the turns, giving credit to earlier
actions that contributed to the good outcome. Actions closest to the reward get the
most credit (high eligibility trace), but earlier enabling actions still get some.

We already have the building blocks —
[TD learning, eligibility traces, gradient bandits](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/)
are all documented in our Sutton reference post. The implementation in OCaml would
follow the same patterns, just applied to token sequences instead of gridworld states.

---

## 6. Self-Play

The most ambitious approach: two copies of Mr. Classic playing against each other.

```
Mr. Classic (Questioner)                Mr. Classic (Answerer)
  ↓                                       ↓
Generates a question                    Generates an answer
  ↓                                       ↓
Rewarded for questions                  Rewarded for correct
the Answerer gets wrong                 answers
```

The Questioner learns to ask harder questions. The Answerer learns to answer them.
They push each other to improve. No human, no external data, no reward model — just
two models and a verification function.

This is how AlphaGo works. Two copies of the same network play Go against each other,
and both get better. The game rules provide the reward signal (who won?).

For language, the "game rules" are trickier. In math: did the Answerer get the right
number? In factual QA: did the answer match ground truth? In conversation: this is
where it gets hard, because there's no mechanical way to verify that a conversation
response is "correct."

Self-play for conversation quality would need a reward model (approach #3) to score
the Answerer's responses. So this approach depends on the others being in place first.

But for math and factual domains with verifiable answers, self-play is elegant and
self-sustaining. The Questioner learns to probe the Answerer's weaknesses. The Answerer
learns to fix them. The curriculum emerges from the adversarial dynamics rather than
being designed by a human.

The question, again: does any of this work at 49M parameters? Nobody has tried. The
model might not have enough capacity for two distinct "roles." But the experiment is
cheap — it's just two forward passes and two gradient updates per step.

---

## The DeepSeek-R1 Lesson

The most important finding from the DeepSeek-R1 paper isn't the benchmarks. It's this:

**For small models, distillation from a large RL-trained model works better than
applying RL directly.**

DeepSeek distilled R1's reasoning traces into small models. A 1.5B distilled model
scored 28.9% on AIME 2024. Applying GRPO directly to that same 1.5B model scored
lower. The large model discovered the reasoning patterns through RL, and the small
model learned to copy them through supervised fine-tuning.

This suggests a hybrid path for Vidya:

1. Use RL (approaches 1-6) to push Mr. Classic as far as RL can take him at 49M
2. Simultaneously, generate reasoning traces from a large model (Claude, Qwen)
3. Fine-tune Mr. Classic on those traces (distillation)
4. Apply RL again on top of the distilled model

RL discovers. Distillation transfers. RL refines. Each technique has a role.

---

## What's Implementable Now

Not all of this requires a GPU. Not all of it requires a bigger model. Here's what
we can build today, in order of implementation difficulty:

| Approach | Difficulty | Requires GPU? | New OCaml code |
|----------|-----------|--------------|----------------|
| 1. Automated rewards | Easy | No | Reward functions |
| 2. GRPO | Medium | Helps, not required | ~200 lines |
| 3. Reward model | Medium | Helps | Second small model |
| 4. Curriculum learning | Hard | Helps | Meta-RL agent |
| 5. Multi-turn TD | Hard | No | TD + traces |
| 6. Self-play | Hard | Yes (for speed) | Dual-model loop |

The starting point is clear: automated rewards on GSM8K with GRPO. One prompt, eight
completions, one reward function, one update rule. Everything else builds on that
foundation.

The [RTX 3060](/posts/burn-the-stack-llms-without-nvidia/) arrives next week. Once
Mr. Classic is training on GPU, generating eight completions per prompt becomes fast
enough to run GRPO at scale. That's when RL gets serious.

---

## The Research Bet

Nobody has published RL results on a model as small as 49M parameters for language
tasks. The smallest published GRPO result is 135M on narrow logical reasoning. The
smallest published DPO result is 350M. We're below the floor of existing research.

There are reasons to think it might work anyway. A recent study found an inverse
scaling effect: smaller models benefit proportionally *more* from RLHF than larger
ones. RL amplifies existing capabilities rather than creating new ones, and a 49M
model trained on 2.4 million conversations has capabilities worth amplifying.

There are reasons to think it might not. 49M parameters may not be enough
representational capacity for RL to discover anything beyond what supervised training
already found. The model may lack the "slack" that RL needs to explore — with so few
parameters, every weight is already working hard just to predict language.

Either way, the experiment is worth running. If RL works at 49M, that's a genuinely
new finding. If it doesn't, we'll know the boundary — and we'll know exactly what to
try when Mr. Classic grows to 500M on
[Tenstorrent Blackhole](/posts/burn-the-stack-llms-without-nvidia/).

---

*This post is a research journal — notes for future implementation, not a report on
completed work. See also:
[Mr. Classic](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/),
[Reinforcement Learning: From Sutton's Foundations to Vidya](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/),
[Feeding Mr. Classic](/posts/feeding-mr-classic-2m-conversations-and-two-fixes/).*

*Co-authored with [Claude](https://claude.ai/).*
