---
title: "My New Blog"
layout: "base.njk"
---

<div class="neofetch-container">
  <!-- <pre class="neofetch-ascii">
    ██████╗ ██╗      ██████╗  ██████╗ 
    ██╔══██╗██║     ██╔═══██╗██╔════╝
    ██████╔╝██║     ██║   ██║█████╗  
    ██╔══██╗██║     ██║   ██║██╔══╝  
    ██║  ██║███████╗╚██████╔╝███████╗
    ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝ 
  </pre> -->
  <div class="neofetch-info">
    <p><span class="neofetch-title">Blog</span>: <a href="https://rolandnsharp.github.io">rolandnsharp.github.io</a></p>
    <p>--------------------</p>
    <p><span class="neofetch-title">GitHub</span>: <a href="https://github.com/rolandnsharp" target="_blank" rel="noopener noreferrer">rolandnsharp</a></p>
    <p><span class="neofetch-title">Email</span>: <a href="mailto:rolandnsharp@example.com">rolandnsharp@example.com</a></p>
    <p><span class="neofetch-title">X</span>: <a href="https://twitter.com/rolandnsharp" target="_blank" rel="noopener noreferrer">@rolandnsharp</a></p>
  </div>
</div>

## Latest Posts

<ul>
{% for post in collections.post %}
  <li>
    <a href="{{ post.url }}">
      {{ post.data.title }}
    </a>
    - <span>{{ post.date | readableDate }}</span>
  </li>
{% endfor %}
</ul>