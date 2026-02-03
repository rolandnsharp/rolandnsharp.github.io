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
    <!-- <p><span class="neofetch-title">Blog</span></p>
    <p>--------------------</p> -->
    <p><span class="neofetch-title">Links:</span></p>
    <p><a href="https://github.com/rolandnsharp" target="_blank" rel="noopener noreferrer">github.com/rolandnsharp</a></p>
    <p><a href="mailto:rolandnsharp@gmail.com">rolandnsharp@gmail.com</a></p>
    <p><a href="https://x.com/rolandnsharp" target="_blank" rel="noopener noreferrer">x.com/rolandnsharp</a></p>
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