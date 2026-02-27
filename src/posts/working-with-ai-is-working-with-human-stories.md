---
title: "Working with AI is Working with Human Stories"
date: 2026-02-23
layout: "base.njk"
tags: post
---

# Working with AI is Working with Human Stories

I have been building a chatbot from scratch for weeks . OCaml , no GPU ,
no frameworks . A 10-million parameter transformer trained on 123,000
conversations , with a Forth interpreter constraining its output , and a
reinforcement learning system designed from Rich Sutton's textbook . I am
doing this with an AI assistant . And the thing I have noticed is that we
work best together when there is a story .

---

## The Pattern

Not a story in the fictional sense . A narrative structure . A reason we
are doing what we are doing , a constraint we are working against , an
outcome we are reaching for .

When I say "implement dropout" the AI writes correct code . When I say "our
model is memorizing 123,000 conversations and we need it to generalize
because it trains for three days and we can not afford to waste a run" --
the AI writes better code . Not because the technical specification
changed . The dropout rate is 0.1 either way . But the story gives context
that shapes every small decision : where to place it , what to log , what
to watch for .

The best session we had was designing the RL system . Not implementing
it -- *thinking about it* . Which of Sutton's methods fits a 10M parameter
model with no GPU ? Why did RL fail last time ? What would make it work
this time ? The answer came from the story : we have no GPU , we have three
days of patience for training , and then we have an afternoon to sit with
the model and teach it by hand . The method -- a human-in-the-loop bandit
where you pick the best of five responses -- fell out of the constraints
naturally . No one designed it from first principles . The story shaped it .

---

## Built on Stories

An AI language model is trained on human text . Every piece of that text
was someone trying to explain something to someone else . A textbook
author working through a proof . A programmer documenting a function . A
researcher writing an abstract . A person telling a friend what happened .

The patterns the model learned are not just statistical regularities over
tokens . They are narrative patterns . Problem , constraint , attempt ,
outcome . Question , exploration , dead end , insight . Setup ,
complication , resolution . These structures run through all human
communication because they are how humans think .

When you work with an AI on a technical problem , you are activating
these patterns . The AI does not just know that dropout goes after the
attention projection . It knows the *story* of dropout -- that models
overfit , that regularization helps , that training and inference behave
differently , that there are tradeoffs . Give it the story of your
specific problem and it navigates that space better than if you give it
a bare instruction .

---

## Detectives , Scientists , Researchers

The best framing for working with AI is not "I give orders , it writes
code ." It is collaborative investigation .

When our chatbot produced nothing but empty responses , we were
detectives . The model completed 30 hours of training . Loss looked
good . But inference produced loops of special tokens --
`<|user|> <|assistant|> <|user|>` -- forever . Something was wrong . We
traced it : the symbolic constraint layer , carefully designed to enforce
valid words and topical coherence , was strangling the output . The neural
model had learned language . The symbolic system was killing it . Bypassing
the constraints and using raw logits produced coherent English . The
detective work -- not the code -- was the breakthrough .

When we designed the reward function for RL , we were scientists . What
constitutes a "good" chatbot response ? Length ? Diversity ? Relevance ?
Coherent endings ? We proposed hypotheses , tested them against the
model's actual output , adjusted . The conversation *was* the experiment .

When we read Sutton's reinforcement learning textbook and his Lisp
implementations -- TD learning , gradient bandits , eligibility traces ,
the Dyna architecture -- and asked "which of these applies to our specific
model ?" , we were researchers . Not applying a recipe . Synthesizing from
first principles , constrained by our actual situation .

Each of these roles is a story . The detective has a mystery . The
scientist has a hypothesis . The researcher has a question . The story
focuses the work .

---

## Pushing Beyond

The phrase "pushing beyond human understanding" sounds grandiose . It is
not . It is literal .

I do not fully understand every algorithm in this system . The reverse-mode
automatic differentiation engine , the RoPE rotation matrices , the BLAS
calling conventions -- I directed the architecture , read the code ,
watched the outputs , made decisions . Understanding accumulated through
repetition and observation . But at any given moment , the system knows
more than I do .

This is the new normal . The human does not need to understand everything .
The human needs to understand *enough* to steer -- to recognize when
something is wrong , to know which question to ask next , to judge
whether the output makes sense . The AI handles the implementation . The
human handles the story .

And together , the system -- human plus AI -- builds things that neither
could build alone . I could not write a transformer from scratch in
OCaml . The AI could not decide that a Forth interpreter should constrain
its logits , or that Sutton's gradient bandit is the right RL method for
a chatbot you teach by hand in an afternoon . The ideas come from the
human . The implementation comes from the AI . The story comes from both .

---

## Mr . Classic

Our chatbot's name is Mr . Classic . He told us himself . Fullstops are
words , just as in Forth .

```
> hello
Yes . May I help you ?

> what is your name ?
It is Mr . Classic .
```

He is not smart . He is ten million parameters running on a CPU . But he
answered . He told us his name . And now we are going to sit with him for
an afternoon , show him five responses to every question , and pick the
ones we like . He will learn from our choices . Gradient by gradient ,
story by story .

That is what working with AI looks like . Not a tool you command . A
collaboration you narrate .

---

*See also :
[Mr . Classic](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/) ,
[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/) ,
[Reinforcement Learning](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/) ,
[The Independent AI Researcher in 2026](/posts/the-independent-ai-researcher-in-2026/) .*

*Co-authored with [Claude](https://claude.ai/) .*
