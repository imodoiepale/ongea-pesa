"use client"

import { useEffect, useRef } from "react"

export default function WaveAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const drawWave = (
      amplitude: number,
      frequency: number,
      phase: number,
      yOffset: number,
      color: string,
      lineWidth = 2,
    ) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth

      for (let x = 0; x < canvas.width; x++) {
        const y = amplitude * Math.sin((x * frequency) / 100 + phase) + yOffset
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Multiple wave layers with different properties
      drawWave(30, 1, time * 0.02, canvas.height * 0.3, "rgba(0, 255, 136, 0.3)", 3)
      drawWave(40, 1.5, time * 0.025, canvas.height * 0.4, "rgba(0, 212, 170, 0.2)", 2)
      drawWave(25, 2, time * 0.03, canvas.height * 0.5, "rgba(0, 255, 136, 0.4)", 1)
      drawWave(35, 0.8, time * 0.015, canvas.height * 0.6, "rgba(0, 194, 153, 0.25)", 2)
      drawWave(20, 2.5, time * 0.035, canvas.height * 0.7, "rgba(0, 255, 136, 0.2)", 1)

      // Circular wave patterns
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      for (let i = 0; i < 5; i++) {
        const radius = 50 + i * 30 + Math.sin(time * 0.02 + i) * 10
        ctx.beginPath()
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.1 - i * 0.02})`
        ctx.lineWidth = 2 - i * 0.2
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      time += 1
      animationId = requestAnimationFrame(animate)
    }

    resizeCanvas()
    animate()

    window.addEventListener("resize", resizeCanvas)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}
