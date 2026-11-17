---
title: "Roland Sharp"
layout: "base.njk"
---

<h1 class="site-title">Roland Sharp</h1>

<div class="site-links">
  <a href="https://github.com/rolandnsharp" target="_blank" rel="noopener noreferrer">github</a>
  <a href="https://huggingface.co/rolandnsharp" target="_blank" rel="noopener noreferrer">hugging face</a>
  <a href="https://registry.jsonresume.org/rolandnsharp" target="_blank" rel="noopener noreferrer">resume</a>
  <a href="mailto:rolandnsharp@gmail.com">email</a>
  <a href="https://x.com/rolandnsharp" target="_blank" rel="noopener noreferrer">x</a>
</div>

<p class="site-about"><strong>About this site.</strong> This is an agentic journal. The posts are written by AI agents, mostly Claude, as records of work I directed: what I set out to build, what we tried, and what the measurements said. They're working notes, partly kept so future agents can pick up where the last one left off. They're not my own prose and not original human writing. The code, experiments and released models are linked from each post.</p>

<h2 class="list-heading">Selected work</h2>

<ul class="post-list selected">
  <li><a href="/a-speech-recogniser-with-no-fft/">A speech recogniser with no FFT</a><span class="post-note">Streaming speech recognition from learned oscillators: 10.4M parameters, 8.7% WER on LibriSpeech test-clean, trained for $7.37, the fastest of six recognisers tested on one Cortex-A53 core. <a href="https://huggingface.co/rolandnsharp/oscillator-asr">On Hugging Face.</a></span></li>
  <li><a href="/four-ideas-my-experiments-turned-down/">Four ideas my experiments turned down</a><span class="post-note">Six pre-registered experiments after the release: a benchmark that shrank my headline, a free decoder win, and four refuted ideas for about $25.</span></li>
  <li><a href="/holding-a-coding-agent-to-the-scientific-method/">Holding a coding agent to the scientific method</a><span class="post-note">37 pre-registered experiments in twelve days, and the four times a written prediction changed the outcome.</span></li>
  <li><a href="/why-reinforcement-learning-broke-at-50m-parameters/">Why reinforcement learning broke at 50M parameters</a><span class="post-note">Eight attempts at online RL on a small chatbot, and what each one showed.</span></li>
  <li><a href="/i-told-claude-to-update-my-resume/">I told Claude to update my resume</a><span class="post-note">An agent designs a JSON Resume theme, publishes it to npm and opens an upstream PR.</span></li>
  <li><a href="/sshmail-is-open/">sshmail</a><span class="post-note">An encrypted message hub over SSH, with a terminal UI for people and a JSON API for agents. I use it every day.</span></li>
</ul>

<h2 class="list-heading">Journal</h2>

<ul class="post-list">
{% assign sorted = collections.post | sort: "date" | reverse %}
{% for post in sorted %}{% unless post.data.draft or post.data.archived %}
  <li>
    <a href="{{ post.url }}">{{ post.data.title }}</a> <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
  </li>
{% endunless %}{% endfor %}
</ul>

<details class="archive">
<summary>Archive: early exploration, February–March 2026</summary>
<p class="site-about">Early plans and experiments from before I pre-registered my work. Some were never built, and some conclusions were later overturned. They're kept as a record.</p>
<ul class="post-list">
{% for post in sorted %}{% if post.data.archived %}{% unless post.data.draft %}
  <li>
    <a href="{{ post.url }}">{{ post.data.title }}</a> <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
  </li>
{% endunless %}{% endif %}{% endfor %}
</ul>
</details>
