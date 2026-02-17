# rolandnsharp.github.io

Personal blog built with [Eleventy (11ty)](https://www.11ty.dev/) v3 and deployed to GitHub Pages.

## Setup

```
npm install
```

## Local Development

```
npm start
```

This runs `eleventy --serve`, which builds the site and starts a local dev server with live reload. Open the URL shown in the terminal (usually `http://localhost:8080`).

## Writing a New Post

1. Create a new Markdown file in `src/posts/`, e.g. `src/posts/my-new-post.md`
2. Add front matter at the top:

```yaml
---
title: "My Post Title"
date: 2026-02-17
layout: "base.njk"
tags: post
---
```

3. Write your content below the front matter using Markdown.

The `tags: post` line is required -- it adds the post to the `collections.post` collection so it appears on the homepage.

## Project Structure

```
src/
  _includes/base.njk   # HTML layout template (Nunjucks)
  css/style.css         # Stylesheet
  js/theme.js           # Dark/light theme toggle
  posts/                # Blog posts (Markdown)
  index.md              # Homepage
.eleventy.js            # Eleventy config
_site/                  # Built output (gitignored)
```

## Publishing

Publishing is automatic. Push (or merge) to the `main` branch and the GitHub Actions workflow (`.github/workflows/deploy.yml`) will:

1. Install dependencies
2. Build the site with `npm run build`
3. Deploy the `_site/` output to GitHub Pages

The site is live at **https://rolandnsharp.github.io**.

You can also trigger a deploy manually from the Actions tab using "Run workflow".

## Build Only

To build the site without serving it:

```
npm run build
```

Output goes to `_site/`.
