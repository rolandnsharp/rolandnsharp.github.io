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
{% assign sorted = collections.post | sort: "data.order" %}
{% for post in sorted %}
  <li>
    <a href="{{ post.url }}">{{ post.data.title }}</a>
  </li>
{% endfor %}
</ul>