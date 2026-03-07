---
title: "Building a JSON Resume Theme Without Leaving the Terminal"
date: 2026-03-07
layout: "base.njk"
tags: post
---

# Building a JSON Resume Theme Without Leaving the Terminal

## Context Before It Collapses

This blog post is a summary of a conversation that will soon be forgotten.

I'm writing this inside Claude Code -- the same session that designed the theme,
published it to npm, created the GitHub repo, updated my gist, and is now
writing these words. When this conversation ends, the context collapses. Claude
won't remember any of it. The theme will exist on npm and GitHub, the gist will
point to it, but the story of how it happened lives only here.

That's the meta point worth making: AI-assisted work is ephemeral by default.
The artifacts persist -- the code, the package, the commits -- but the
decision-making process, the back-and-forth, the "make the project cards pop
more" followed by a CSS tweak followed by a screenshot followed by "yeah that's
better" -- all of that vanishes. Unless you write it down.

So here it is, written down.

## The Setup

My friend Ajax (Thomas Davis) founded [JSON Resume](https://jsonresume.org) over
a decade ago. I built the original CLI tool -- `resume-cli` -- which has 4.2K
stars on GitHub. The idea was simple: a JSON schema for resumes,
with themes that render them into HTML, and a registry that hosts them
automatically from a GitHub gist.

The ecosystem has matured. Someone built
[resumed](https://github.com/rbardini/resumed), a clean 180-line ESM
reimplementation of my CLI. There are 50+ community themes. The registry is
still running. My resume still lives at
[registry.jsonresume.org/rolandnsharp](https://registry.jsonresume.org/rolandnsharp).

I hadn't touched any of it in years. Time to come back -- not to maintain
plumbing, but to ship something new.

## The Workflow

Everything that follows happened in a single terminal session with Claude Code.
No browser. No Figma. No design tools. Just natural language prompts and tool
calls.

### 1. Research

First, Claude researched how modern JSON Resume themes work. The contract is
dead simple: export a `render(resume)` function that takes a JSON object and
returns an HTML string. All CSS must be inlined. No filesystem access. The
registry picks up any npm package named `jsonresume-theme-*`.

The old boilerplate used Handlebars and `fs.readFileSync`. The modern approach
is pure ESM with template literals. No build step needed.

### 2. Scaffolding

```bash
npm init -y
npm install resumed markdown-it playwright
```

Three dependencies. `resumed` to test rendering. `markdown-it` because resume
fields often contain markdown. `playwright` for the trick that makes this whole
thing work.

### 3. The Design Loop

Here's the interesting part. Claude is working in a terminal. It can't open a
browser. So we set up a feedback loop:

1. Write the theme (HTML + CSS in a single `index.js`)
2. Render it against my actual resume data
3. Use Playwright to screenshot the result
4. Claude *looks at the screenshot* using its vision capabilities
5. Identify what needs improvement
6. Edit the CSS
7. Repeat

I never saw the screenshots during this process. I wasn't part of the visual
feedback loop at all. Claude was rendering, screenshotting, viewing its own
output, critiquing it, and making CSS adjustments -- all autonomously. I only
opened the HTML in a browser after Claude said it was done. The first time I saw
the design was the finished product.

An AI doing visual design work through screenshots, iterating on its own output,
with no human in the visual loop. The first pass came out surprisingly clean --
good typographic hierarchy, proper spacing, responsive grid for skills. A few
rounds of self-directed iteration later: subtle entry separators, punchier
project cards, tighter line heights. I opened it, said "love it," and we moved
on to publishing.

### 4. The Theme

The result is
[jsonresume-theme-claude](https://github.com/rolandnsharp/jsonresume-theme-claude).
A single `index.js` file. Features:

- System font stack (no web font loading)
- Dark mode via `prefers-color-scheme`
- Print-optimized `@media print` styles
- CSS custom properties for theming
- Inline SVG icons (Lucide-style)
- Markdown rendering in descriptions
- Responsive layout
- Gradient accent bar header

Zero build tooling. The render function is ~300 lines of template literals and
CSS. That's the whole theme.

### 5. Publishing

This is where it gets fast.

```bash
# Create the npm package
npm publish

# Create the GitHub repo and push -- one command
gh repo create jsonresume-theme-claude --public --source=. --push

# Update my resume gist to use the new theme
gh gist edit f20e7107dec700782ab6dcb25c71d2ca resume.json

# Request the theme be added to the registry
gh issue comment 36 --repo jsonresume/jsonresume.org --body "..."
```

Four commands. Package on npm. Repo on GitHub with README and screenshot. Gist
updated. Theme requested on the registry. All executed by Claude, all without
leaving the terminal.

### 6. This Blog Post

And now Claude is writing this post, adding it to my Eleventy blog, which will
deploy via GitHub Pages when pushed. The entire chain -- from "let's build a
theme" to published blog post -- happened in one conversation.

## What This Actually Demonstrates

This isn't really about JSON Resume themes. It's about what the workflow looks
like now.

I didn't write the CSS. I didn't hand-craft the HTML. I didn't fiddle with npm
publish flags or remember the `gh repo create` syntax. I said what I wanted in
plain English and steered the results.

But I also didn't just say "make me a resume theme" and walk away. I knew the
JSON Resume ecosystem because I helped build it. I knew what `resumed` was. I
knew the registry needs themes to be serverless-compatible. I knew to check
whether the registry has an allowlist. I knew to ask Ajax to add it.

The skill isn't prompting. The skill is *context* -- knowing enough about the
system to direct the work, evaluate the output, and catch the gaps. Claude
didn't know the registry has an allowlist. I didn't know the exact `gh gist
edit` syntax. Together we covered it.

## The Ephemeral Part

After I send the next message, this conversation continues. After a few more,
the context window fills up and earlier messages get compressed. Eventually the
session ends and it all disappears.

Claude won't remember building this theme. Won't remember the screenshot loop.
Won't remember that Ajax is Thomas's chosen name. Every future conversation
starts from zero.

The code survives. The blog post survives. The npm package survives. But the
process that created them -- the actual collaboration -- exists only as
artifacts and this write-up.

That's fine. That's how it works. You do the work, you write it down, the
context collapses, and next time you start fresh with better artifacts.

This post is me writing it down.

---

*Theme:
[jsonresume-theme-claude](https://github.com/rolandnsharp/jsonresume-theme-claude)
on npm and GitHub. Resume:
[registry.jsonresume.org/rolandnsharp](https://registry.jsonresume.org/rolandnsharp).
Built with [Claude Code](https://claude.ai/claude-code).*
