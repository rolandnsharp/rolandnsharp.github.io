---
title: "Flash Attention Fixed Everything"
date: 2026-03-21
layout: "base.njk"
tags: post
---

# Flash Attention Fixed Everything

We spent two days debugging NaN in a transformer trained from scratch
in Nim with CUDA. Every fix failed. Lower learning rate — delayed
the NaN. Gradient clipping — NaN appeared in the forward pass
instead. Dropout, QK-Norm, weight decay, learnable gamma, different
init std — nothing worked. The model would train beautifully to loss
4.6, then explode.

The fix was one CUDA kernel.

---

## The Bug

The attention mechanism computes `softmax(Q·K^T / sqrt(d)) @ V`. In
float32, `exp(x)` overflows to infinity when `x > 88`. Our attention
computed the full score matrix, applied a causal mask, then ran softmax
in a separate kernel. The softmax subtracts the max before computing
`exp()` — this is the standard numerical stability trick and it
should prevent overflow.

It didn't. Here's why.

As the model trained, it learned to sharpen attention — making some
Q·K^T scores very large to focus on specific positions. After scaling
by `1/sqrt(d)`, the largest scores approached 80-90. The softmax
handled these fine (max subtraction works). But the *gradients* through
the attention became large, slowly pushing the projection weights
further. Eventually some weight grew enough that a specific Q·K^T
product exceeded 88 after scaling. `exp(89) = inf`. `inf × V = inf`.
The inf propagated through the residual stream, corrupted the RMSNorm,
and the entire forward pass produced NaN.

We traced it precisely:

```
NaN at step 1558
  INF: L1.attnOut[7424]=4.221511e+34
  NaN: L1.xInput2[7424]
  NaN: L1.xNorm2[7424]
  NaN: L1.fc1Out[29696]
  ...everything downstream...
```

The first infinity appeared in the attention output of layer 1. All
Q, K, V values were finite. The infinity was born inside the
`softmax(scores) @ V` computation.

We tried clamping the scores before softmax. It prevented the forward
NaN but introduced a gradient inconsistency — the backward didn't
know about the clamp, producing wrong gradients that slowly corrupted
the weights until they themselves became NaN.

---

## The Fix

Flash attention computes the entire attention operation — score,
scale, mask, softmax, weighted sum — in a single fused kernel using
online softmax. The key insight: instead of computing all scores,
finding the max, then computing `exp(score - max)`, it processes
one key-value pair at a time and maintains a running maximum.

```
m = -inf          # running max score
l = 0             # running sum of exp
acc = 0           # running output (unnormalized)

for each key-value pair (k, v):
    score = q · k * scale
    m_new = max(m, score)
    exp_old = exp(m - m_new)      # rescale old accumulator
    exp_new = exp(score - m_new)  # always ≤ 0, never overflows
    l_new = l * exp_old + exp_new
    acc = acc * (l * exp_old / l_new) + v * (exp_new / l_new)
    m = m_new
    l = l_new
```

The critical line: `exp(score - m_new)`. Since `m_new` is the
maximum score seen so far, `score - m_new ≤ 0`. The exponent is
always non-positive. `exp(0) = 1`. `exp(-anything) < 1`. **Overflow
is mathematically impossible.**

The full kernel is 40 lines of CUDA:

```cuda
__global__ void k_flash_attn_fwd(
    const float *Q, const float *K, const float *V, float *O,
    int S, int hd, float scale, int causal
) {
    int row = blockIdx.x;
    int j = threadIdx.x;
    if (row >= S || j >= hd) return;

    const float *q = Q + row * hd;
    float m = -FLT_MAX, l = 0.0f, acc = 0.0f;
    int max_col = causal ? (row + 1) : S;

    for (int col = 0; col < max_col; col++) {
        float score = 0.0f;
        for (int d = 0; d < hd; d++)
            score += q[d] * K[col * hd + d];
        score *= scale;

        float m_new = fmaxf(m, score);
        float exp_old = expf(m - m_new);
        float exp_new = expf(score - m_new);
        float l_new = l * exp_old + exp_new;

        acc = acc * (l * exp_old / l_new)
            + V[col * hd + j] * (exp_new / l_new);
        m = m_new;
        l = l_new;
    }
    O[row * hd + j] = acc;
}
```

---

## The Result

Before flash attention: NaN at every learning rate above 0.00003
after 1000-2000 steps. Loss plateaued at 7.0 because the learning
rate was too low to make progress.

After flash attention: stable training at lr=0.0003 (10x higher).
Loss dropped from 7.7 to 4.6 in 8000 steps with zero NaN. The model
is still training.

```
opt  1000 | loss 7.11 | lr 0.000150
opt  2000 | loss 6.78 | lr 0.000300
opt  4000 | loss 5.00 | lr 0.000300
opt  8000 | loss 4.62 | lr 0.000299
```

28 million parameters. 8 layers. 512 dimensions. Training from
scratch on 37,000 conversations. Written in Nim. Direct CUDA.
No PyTorch.

---

## The Lesson

We spent two days trying every hyperparameter trick: lower learning
rate, gradient clipping, dropout, weight decay, QK-Norm, different
init std, different beta values, gradient accumulation. None of it
mattered because the problem was architectural — the standard
separate-kernel attention computation is numerically fragile in
float32.

Flash attention isn't just faster (it is — O(n) memory instead of
O(n²)). It's *correct*. The online softmax makes overflow
impossible by construction. Every serious training framework uses it
or something equivalent. We should have implemented it first instead
of last.

The code is 40 lines of CUDA. The bug it fixed took 2000 lines of
debugging to find.

---

*See also:
[NimLLM](/posts/nimllm-a-local-language-model-you-own/),
[103M Parameters on a 3060](/posts/103m-parameters-on-a-3060-training-vidya-on-gpu/).*

*Co-authored with [Claude](https://claude.ai/).*
