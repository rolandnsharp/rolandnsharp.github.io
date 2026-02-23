---
title: "Mr . Classic: Teaching a 10M Parameter Chatbot with Reinforcement Learning"
date: 2026-02-23
layout: "base.njk"
tags: post
order: 7
---

# Mr . Classic

We don't have a GPU. We have a mass-market desktop CPU and three days of
patience. This is the story of training a chatbot from scratch in OCaml,
getting it to talk, and designing a reinforcement learning method to teach
it further -- by hand.

---

## The Model

Vidya v4 is a 10-million parameter transformer written from scratch in OCaml.
No PyTorch, no TensorFlow, no CUDA. A hand-rolled autograd engine, BLAS for
matrix multiplication, BPE tokenizer, Adam optimizer, cosine learning rate
schedule. 12 layers, 256 dimensions, 8 attention heads, 2218-token vocabulary.

It trains on 123,000 conversations scraped from DailyDialog, SODA, ShareGPT,
and UltraChat. Three hundred thousand gradient steps. About three days on a
single core.

```
num docs: 123406
BPE: 215 chars + 2000 merges = 2218 vocab | 3.0 chars/token
num params: 10011648
step  2500 / 300000 | loss 5.8954 | 33m56s elapsed | 67h18m31s remaining
step  5000 / 300000 | loss 4.7303 | 1h07m03s elapsed
step 10000 / 300000 | loss 4.2129 | 2h11m58s elapsed
step 17500 / 300000 | loss 3.8585 | 3h48m32s elapsed | 61h29m24s remaining
```

The loss is still dropping. We wait.

---

## First Contact

The v3 model -- trained on 37,000 conversations -- produced our first real
conversation. Fullstops and punctuation marks are words, just as in Forth.
The spaces are part of the BPE encoding:

```
> hello
Yes . May I help you ?

> what is your name ?
It is Mr . Classic .

> nice to meet you Mr . Classic . what is your favorite color ?
It is very nice . the blue one of our most popular film .
```

Mr . Classic knows his name. He knows blue is a color. He drifts after that --
"our most popular film" comes from the training data leaking through in
fragments. But this is a model with fewer parameters than a JPEG image of a
cat, generating coherent English turn by turn.

The symbolic constraint layer we'd carefully built -- word validation, concept
coherence, topic depth penalties -- turned out to strangle the output. Bypassing
it and using raw logits with top-k sampling and a repetition penalty produced
better text. The neural model had learned more than we gave it credit for.

---

## The Problem with Imitation

Standard training is imitation learning. The model sees 123,000 conversations
and learns to predict the next token. Copy what the training data does. This
works -- it's how every language model trains -- but it has a ceiling.

The model never tries something, sees if it worked, and adjusts. It never
explores. It never gets told "that response was good, do more of that." It
copies, but it doesn't learn from consequences.

This is where
[Rich Sutton](http://incompleteideas.net/) comes in.

---

## Three Principles from Sutton

Sutton's [reinforcement learning textbook](http://incompleteideas.net/book/RLbook2020.pdf)
and his [reference implementations in Common Lisp](http://incompleteideas.net/book/code/code2nd.html)
describe agents that learn from scratch. A tabular Q-learner with 100 states
and 4 actions masters a gridworld purely from reward signals. No pretraining.
No imitation. Just trial, error, and adjustment.

Three principles from that work that our chatbot currently lacks:

**1. Trial and error.** Sutton's agents learn by doing and observing outcomes.
Our model only learns by copying. It should generate responses, get feedback,
and update.

**2. Credit assignment.** Our training loss treats every token equally. But some
tokens matter more than others -- the one that set the topic, the one that
derailed it. Sutton's TD learning with eligibility traces gives more credit to
the actions that actually mattered:

```lisp
;; From Sutton's gradient bandit (Chapter 2, Figure 2.5):
(defun learn (A R time-step)
  (incf Rbar (/ (- R Rbar) (1+ time-step)))  ; update baseline
  (let ((alpha-delta (* alpha (- R Rbar))))
    (loop for a below n do
          (decf (aref H a) (* alpha-delta (aref policy a))))
    (incf (aref H A) alpha-delta)))
```

Actions that beat the baseline get reinforced. Actions below it get suppressed.
This single function is the core of policy gradient methods -- the same
principle that scales to RLHF on billion-parameter models.

**3. Exploration.** Our model samples from its learned distribution -- passive
exploration via randomness. Sutton's agents actively explore: epsilon-greedy
tries random actions, UCB explores uncertain actions, optimistic initialization
drives early exploration. Active exploration discovers capabilities the model
has but doesn't use by default.

---

## The Method: Human-in-the-Loop Bandit

We combine inference and learning. The model generates. A human teaches.

The design is a multi-armed bandit with human feedback:

```
repeat:
  1. present a prompt to the model
  2. generate 5 responses at temperature 0.7
  3. display all 5 to the human
  4. human hits 1-5 on the numpad to select the best
     OR types a better response if all five are bad
  5. compute policy gradient update
  6. apply gradient step
```

When the human selects response 3 out of 5, the gradient bandit update kicks
in. The selected response gets positive advantage. The four rejected responses
get negative advantage. The model shifts toward what the human preferred and
away from what they didn't.

When the human types their own response -- because none of the five were good
enough -- that's even more powerful. It breaks the capability ceiling. The model
learns patterns it couldn't generate on its own.

Early in training, you type a lot. As the model improves, you hit the numpad
more. That shift from typing to selecting IS the model getting smarter.

At one second per selection, 5000 selections takes about 90 minutes. One
afternoon, one person, 5000 preference signals into a 10-million parameter
model. Each signal is clean, targeted, and unambiguous. No proxy reward
function. No hand-crafted heuristic. The human is the reward.

---

## Two Forms of Intelligence

The model now learns from two sources:

**Inference** -- 300K steps of next-token prediction on 123K conversations.
The model learns what language looks like. What tokens follow what. The
statistical structure of conversation. This is the foundation. It takes three
days and produces Mr . Classic .

**Learning** -- human-in-the-loop reinforcement. The model generates, the human
evaluates, the model adjusts. This is Sutton's framework applied directly:
trial and error, credit assignment, exploration. It takes an afternoon and
pushes the model beyond what imitation alone can achieve.

The first gives the model language. The second gives it judgement.

---

## What We Expect

We expect measurable improvement in response quality after RL training.
Longer responses. Better coherence. Cleaner endings. The model learning the
human's preferences for what a good chatbot response looks like.

We don't expect it to become smart from selection alone. Ten million parameters
is ten million parameters. Picking the best of five redistributes what the model
already knows -- surfacing its best responses more often, suppressing its worst
tendencies.

But when the human types their own response -- because none of the five were
good enough -- that's different. That's new data. The model learns patterns it
couldn't generate on its own. Over thousands of typed responses, the model
acquires knowledge beyond its training set. The architecture supports this
trivially: a typed response is just another training sequence. Same loss
function, same gradient, same Adam step. The only difference is where the target
came from -- not from the model's own generation, but from a human who knows
better.

The v4 model is still training. When it finishes, we teach it.

---

*Vidya is written from scratch in OCaml. The source is at
[github.com/rolandnsharp/vidya](https://github.com/rolandnsharp/vidya).
The RL method draws on Rich Sutton's
[reinforcement learning textbook](http://incompleteideas.net/book/RLbook2020.pdf)
and [Lisp implementations](http://incompleteideas.net/book/code/code2nd.html).*

*Co-authored with [Claude](https://claude.ai/).*
