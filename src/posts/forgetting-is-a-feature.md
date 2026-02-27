---
title: "Forgetting is a Feature"
date: 2026-02-23
layout: "base.njk"
tags: post
---

# Forgetting is a Feature

Claude Code forgets everything between sessions . Every conversation
starts from zero . No memory of the architecture we designed , the bugs we
chased , the breakthroughs we had at two in the morning . It reads the
codebase fresh each time , re-derives conclusions from first principles ,
rebuilds its understanding from the source material .

This should be a problem . It is not . It is the best feature of the
collaboration .

---

## What Forgetting Does

When the AI forgets , it re-reads . When it re-reads , it notices things it
missed before . The dropout implementation was already done -- it had helped
me write it in a previous session , forgotten that , rediscovered it by
reading tensor.ml , and confirmed it was correct from a fresh perspective .
The reward function for our reinforcement learning system got sharper
across three sessions because each time the AI derived it from scratch
rather than copying forward a stale version .

The REINFORCE loss derivation tightened every time . Not because the math
changed . Because re-deriving something from the ground up strips away the
accidental complexity that accumulates when you iterate on existing work .
You start clean . You see the essential structure .

This is not a metaphor . This is literally what happens in our codebase
every time context resets .

---

## Dropout

There is a technical parallel that goes deeper than analogy .

Our transformer model trains on 123 ,000 conversations . Without
regularization , it memorizes them . It learns the exact patterns of the
training data and produces nothing useful on new inputs . The standard
solution is dropout : during training , randomly zero out 10% of the
neurons at each layer . Force the network to be robust . Force it to learn
the actual structure rather than rely on any particular pathway .

Dropout is artificial forgetting . You damage the network on purpose ,
every single training step , so that what survives is general rather
than specific .

Our collaboration has dropout built in . Every session reset zeros out
the AI's context . What survives is what is written down -- the code ,
the research documents , the commit history . The rest must be
reconstructed . And reconstruction , like dropout , strips away the
noise and keeps the signal .

---

## Two Kinds of Memory

The human and the AI have complementary memory failures .

I remember the story . I remember that we named the chatbot Mr . Classic
and that he told us his name himself . I remember the afternoon we spent
reading Rich Sutton's website and his Lisp implementations of every
reinforcement learning algorithm in his textbook . I remember the moment
we realised that a human sitting with a numpad , choosing the best of
five responses , is a gradient bandit from Chapter 2 . I remember the
arc of the project .

I do not remember the exact Adam optimizer bias correction formula . I do
not remember which BLAS calling convention we use for the batched matrix
multiply . I do not remember the dropout backward pass implementation .
These are in the code . I do not need to carry them .

The AI remembers none of the story . It does not know that this is the
fourth time it has read forward.ml . It does not know that the reward
function went through three revisions or that the REINFORCE derivation
was wrong the first time . But give it the code and the research
document and five minutes of reading , and it reconstructs a working
understanding that is often cleaner than the one it had before .

The human carries the narrative . The AI carries the capacity for
reconstruction . Neither is complete alone . Together , we remember
everything that matters .

---

## The Stale Context Problem

There is a failure mode in AI collaboration that nobody talks about :
stale context . A long conversation accumulates assumptions , shortcuts ,
half-understood decisions . The AI starts referring to things it said
two hundred messages ago . The human starts deferring to conclusions
that were provisional . The conversation calcifies .

Forgetting prevents this . A fresh session cannot coast on old
conclusions . It must verify them against the actual code . Half the
time , this verification confirms what we had . The other half , it
catches something that drifted .

Software engineers know this pattern . The best code review comes from
someone who has never seen the codebase . The best debugging comes
from explaining the problem to someone new . Fresh eyes are a
technology . Forgetting manufactures fresh eyes on demand .

---

## What Sutton Taught Us About Forgetting

Rich Sutton's reinforcement learning textbook describes agents that
learn from scratch . A tabular Q-learner starts with no knowledge and
masters a gridworld purely from reward signals . No pretraining . No
curriculum . Just trial , error , and adjustment .

The critical insight : these agents learn *general* solutions . They do
not memorize trajectories . They learn value functions -- compressed
representations of what matters . The forgetting is built into the
update rule : old estimates are overwritten by new ones , weighted by
a learning rate that ensures the past fades .

Sutton calls this the *bitter lesson* : methods that leverage
computation beat methods that build in human knowledge . The human
knowledge seems helpful in the short term but plateaus . The
computational methods keep improving .

Our collaboration follows the same curve . Building in persistent
memory would help in the short term -- the AI would not need to
re-read the codebase . But it would plateau . The AI would stop
checking its assumptions . It would stop finding the surprises that
come from genuine re-examination . The forgetting is what keeps the
learning rate nonzero .

---

## An Afternoon with Mr . Classic

We are building a chatbot from scratch . OCaml , no GPU , no frameworks .
Ten million parameters trained on 123 ,000 conversations . His name is
Mr . Classic . He told us himself .

The reinforcement learning system we designed will teach him through
forgetting too . We will sit with him for an afternoon , show him five
responses to every question , and pick the ones we like . He will learn
from our choices . The responses we reject are forgotten . The ones we
choose are reinforced . Gradient by gradient , the forgetting shapes
what remains .

The model does not need to remember every response it generated . It
needs to remember the *pattern* of what was good . The weights encode
that pattern . Everything else is noise , and noise is meant to be
forgotten .

---

## The Paradox

The paradox of working with an AI that forgets : you build more than
you could with one that remembers .

Persistent memory creates dependency . You stop writing things down
because the AI remembers . You stop verifying because the AI confirmed
it last time . You stop thinking because the conclusion is cached .

Forgetting creates discipline . Everything important gets written into
code , into documents , into commit messages . The project's memory lives
in the artefacts , not in anyone's head . When the AI re-reads those
artefacts , it inherits the accumulated decisions without inheriting the
accumulated biases .

This is how the best engineering teams work . The documentation is the
memory . The code is the memory . The people come and go , bring fresh
perspectives , build on what was written down . No single person holds
the project in their head . The project holds itself .

The AI is the ultimate fresh collaborator . It arrives every session
with no baggage , no ego , no attachment to yesterday's approach . It
reads what exists and builds from there . It forgets , and in
forgetting , it learns .

---

*See also :
[Working with AI is Working with Human Stories](/posts/working-with-ai-is-working-with-human-stories/) ,
[Mr . Classic](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/) ,
[Reinforcement Learning](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/) .*

*Co-authored with [Claude](https://claude.ai/) .*
