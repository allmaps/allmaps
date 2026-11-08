<script lang="ts">
  import { page } from '$app/state'
  import {
    blue,
    darkblue,
    purple,
    orange,
    red,
    pink,
    green,
    yellow
  } from '@allmaps/tailwind'

  const colors = { blue, darkblue, purple, orange, red, pink, green, yellow }

  type Props = {
    text: string
    palette?: keyof typeof colors
    color?: string
    duration?: number
    hoverDuration?: number
  }

  let {
    text,
    palette,
    color,
    duration = 3.7,
    hoverDuration = 0.5
  }: Props = $props()

  const introPalette: keyof typeof colors | 'all' = $derived(
    palette ?? page.data.metadata?.hero?.palette ?? 'purple'
  )
  const introColor = $derived(
    color ?? (introPalette === 'all' ? purple : colors[introPalette])
  )
</script>

<div
  class="page-intro not-prose"
  style:--intro-color={introColor}
  style:--intro-duration={`${duration}s`}
  style:--intro-hover-duration={`${hoverDuration}s`}
>
  <p>
    {text}<span class="color-fill entrance-fill" aria-hidden="true">{text}</span
    ><span class="color-fill hover-fill" aria-hidden="true">{text}</span>
  </p>
</div>

<style>
  .page-intro {
    --intro-ink: #222222;

    margin: 0;
    padding-block: 2.5rem;
    color: var(--intro-ink);
    font-size: clamp(2rem, 5vw, 3.125rem);
    font-weight: 500;
    line-height: 1.22;
    letter-spacing: -0.025em;
    overflow-wrap: break-word;
  }

  .page-intro + :global(*) {
    margin-block-start: 0;
  }

  p {
    position: relative;
    isolation: isolate;
    margin: 0;
  }

  .color-fill {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    background-image: linear-gradient(
      100deg,
      var(--intro-ink) 0%,
      var(--intro-ink) 34%,
      var(--intro-color) 47%,
      var(--intro-color) 100%
    );
    background-size: 340% 100%;
    background-position: 0% 50%;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }

  @supports (background-clip: text) or (-webkit-background-clip: text) {
    .entrance-fill {
      z-index: 1;
      animation: intro-color-pass var(--intro-duration)
        cubic-bezier(0.25, 0.1, 0.25, 1) 0.2s 1 both;
    }

    .hover-fill {
      opacity: 1;
      transition: background-position var(--intro-duration)
        cubic-bezier(0.25, 0.1, 0.25, 1);
    }

    @media (hover: hover) {
      p:hover .hover-fill {
        background-position: 100% 50%;
        transition-duration: var(--intro-hover-duration);
      }
    }
  }

  @keyframes intro-color-pass {
    0% {
      background-position: 100% 50%;
      opacity: 1;
    }
    85% {
      background-position: 0% 50%;
      opacity: 1;
    }
    100% {
      background-position: 0% 50%;
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce), print {
    .color-fill {
      display: none;
      animation: none;
    }
  }
</style>
