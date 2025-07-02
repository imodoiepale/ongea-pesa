"use client"

import { useEffect, useRef } from "react"

interface VoiceWaveformProps {
  isActive: boolean
  position: "top" | "bottom"
}

export default function VoiceWaveform({ isActive, position }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const drawWaveform = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const width = canvas.width / window.devicePixelRatio
      const height = canvas.height / window.devicePixelRatio
      const centerY = height / 2

      if (isActive) {
        // Active waveform with multiple layers
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath()
          ctx.strokeStyle = `rgba(0, 255, 136, ${0.8 - layer * 0.2})`
          ctx.lineWidth = 3 - layer * 0.5

          for (let x = 0; x < width; x++) {
            const frequency = 0.02 + layer * 0.01
            const amplitude = (20 + layer * 10) * (isActive ? 1 : 0.1)
            const phase = time * (0.05 + layer * 0.02)
            const y = centerY + amplitude * Math.sin(x * frequency + phase)

            if (x === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          ctx.stroke()
        }

        // Additional flowing lines for complexity
        for (let i = 0; i < 5; i++) {
          ctx.beginPath()
          ctx.strokeStyle = `rgba(0, 212, 170, ${0.3 - i * 0.05})`
          ctx.lineWidth = 1

          for (let x = 0; x < width; x++) {
            const frequency = 0.03 + i * 0.005
            const amplitude = 15 + i * 5
            const phase = time * (0.03 + i * 0.01) + i * Math.PI * 0.5
            const y = centerY + amplitude * Math.sin(x * frequency + phase)

            if (x === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          ctx.stroke()
        }
      } else {
        // Idle state - subtle flat line with minimal movement
        ctx.beginPath()
        ctx.strokeStyle = "rgba(0, 255, 136, 0.3)"
        ctx.lineWidth = 2

        for (let x = 0; x < width; x++) {
          const y = centerY + 2 * Math.sin(x * 0.01 + time * 0.02)
          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }

      time += 1
      animationId = requestAnimationFrame(drawWaveform)
    }

    resizeCanvas()
    drawWaveform()

    window.addEventListener("resize", resizeCanvas)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [isActive])

  return (
    <div className="w-full h-16 relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          filter: isActive ? "drop-shadow(0 0 10px rgba(0, 255, 136, 0.5))" : "none",
        }}
      />
    </div>
  )
}
