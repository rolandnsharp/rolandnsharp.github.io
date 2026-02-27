---
title: "NEUROMANCY"
layout: "base.njk"
---

<pre class="site-title-ascii">
 ███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗ ███╗   ███╗ █████╗ ███╗   ██╗ ██████╗██╗   ██╗
 ████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗████╗ ████║██╔══██╗████╗  ██║██╔════╝╚██╗ ██╔╝
 ██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║██╔████╔██║███████║██╔██╗ ██║██║      ╚████╔╝
 ██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║       ╚██╔╝
 ██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝██║ ╚═╝ ██║██║  ██║██║ ╚████║╚██████╗   ██║
 ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝
</pre>

<div class="site-links">
  <a href="https://github.com/rolandnsharp" target="_blank" rel="noopener noreferrer">github</a>
  <a href="mailto:rolandnsharp@gmail.com">email</a>
  <a href="https://x.com/rolandnsharp" target="_blank" rel="noopener noreferrer">x</a>
</div>

<ul class="post-list">
{% assign sorted = collections.post | sort: "date" | reverse %}
{% for post in sorted %}{% unless post.data.draft %}
  <li>
    <a href="{{ post.url }}">{{ post.data.title }}</a> <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
  </li>
{% endunless %}{% endfor %}
</ul>