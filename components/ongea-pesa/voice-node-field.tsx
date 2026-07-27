"use client"

import type { CSSProperties } from "react"
import { AudioLines, Mic } from "lucide-react"

const nodes = [
  [44, 174, 1.1], [62, 112, .75], [91, 69, .9], [146, 45, .7],
  [211, 51, .8], [270, 78, 1], [314, 126, .7], [324, 194, .9],
  [294, 254, .75], [245, 301, 1], [178, 317, .8], [112, 295, .7],
  [65, 253, .95], [116, 141, .65], [249, 146, .65], [231, 226, .6],
] as const

export function VoiceNodeField({
  active,
  speaking,
  processing,
  timer,
}: {
  active: boolean
  speaking: boolean
  processing: boolean
  timer?: string
}) {
  const status = processing ? "Understanding" : speaking ? "Speaking" : active ? "Listening" : "Ready"

  return (
    <section
      className="voice-node-field"
      data-active={active || processing || speaking}
      data-processing={processing}
      aria-label={`Voice assistant ${status.toLowerCase()}`}
    >
      <svg viewBox="0 0 360 360" aria-hidden="true">
        <defs>
          <radialGradient id="voice-field-core">
            <stop offset="0" stopColor="#ecfff9" stopOpacity=".95" />
            <stop offset=".18" stopColor="#1ce4ba" stopOpacity=".86" />
            <stop offset=".52" stopColor="#00aeca" stopOpacity=".18" />
            <stop offset="1" stopColor="#00171b" stopOpacity="0" />
          </radialGradient>
          <filter id="voice-field-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g className="voice-node-field__grid">
          <circle cx="180" cy="180" r="52" />
          <circle cx="180" cy="180" r="91" />
          <circle cx="180" cy="180" r="132" />
          <ellipse cx="180" cy="180" rx="151" ry="72" transform="rotate(-16 180 180)" />
          <ellipse cx="180" cy="180" rx="147" ry="63" transform="rotate(42 180 180)" />
          <path d="M35 180H325M180 35V325" />
        </g>

        <g className="voice-node-field__links">
          <path d="M44 174C92 124 122 116 180 180" />
          <path d="M91 69C128 112 146 127 180 180" />
          <path d="M270 78C242 122 222 145 180 180" />
          <path d="M324 194C262 194 226 188 180 180" />
          <path d="M294 254C249 236 220 210 180 180" />
          <path d="M178 317C180 264 181 227 180 180" />
          <path d="M65 253C111 230 137 206 180 180" />
        </g>

        <g className="voice-node-field__nodes">
          {nodes.map(([cx, cy, scale], index) => (
            <g key={`${cx}-${cy}`} style={{ "--node-delay": `${index * -0.27}s`, "--node-scale": scale } as CSSProperties}>
              <circle cx={cx} cy={cy} r="5.5" className="voice-node-field__node-halo" />
              <circle cx={cx} cy={cy} r="1.8" className="voice-node-field__node" />
            </g>
          ))}
        </g>

        <g className="voice-node-field__travellers" filter="url(#voice-field-glow)">
          <circle r="2.2"><animateMotion dur="3.1s" repeatCount="indefinite" path="M44 174C92 124 122 116 180 180" /></circle>
          <circle r="1.8"><animateMotion dur="4.4s" begin="-.8s" repeatCount="indefinite" path="M270 78C242 122 222 145 180 180" /></circle>
          <circle r="2"><animateMotion dur="3.7s" begin="-1.9s" repeatCount="indefinite" path="M294 254C249 236 220 210 180 180" /></circle>
          <circle r="1.7"><animateMotion dur="4.8s" begin="-2.6s" repeatCount="indefinite" path="M65 253C111 230 137 206 180 180" /></circle>
        </g>

        <circle cx="180" cy="180" r="67" fill="url(#voice-field-core)" className="voice-node-field__aura" />
        <circle cx="180" cy="180" r="38" className="voice-node-field__core-ring" />
        <circle cx="180" cy="180" r="27" className="voice-node-field__core-disc" />
      </svg>

      <div className="voice-node-field__core-content">
        {active ? <AudioLines aria-hidden="true" /> : <Mic aria-hidden="true" />}
        <strong aria-live="polite">{status}</strong>
        {timer && active ? <small>{timer}</small> : null}
      </div>
    </section>
  )
}
