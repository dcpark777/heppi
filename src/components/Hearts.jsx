import { useEffect, useRef } from 'react'
import './Hearts.css'

const HEART_CHARS = ['❤', '💕', '💗', '💖', '💓', '💝']

function Hearts() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    const hearts = []
    const heartCount = 30

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    function createHeart() {
      const sizes = [14, 18, 22, 26, 30]
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        char: HEART_CHARS[Math.floor(Math.random() * HEART_CHARS.length)],
        speed: Math.random() * 0.6 + 0.4,
        opacity: Math.random() * 0.4 + 0.5,
        sway: Math.random() * 0.2 + 0.05
      }
    }

    function init() {
      resize()
      for (let i = 0; i < heartCount; i++) {
        hearts.push(createHeart())
      }
    }

    function update() {
      for (let i = 0; i < hearts.length; i++) {
        const h = hearts[i]
        h.y += h.speed
        h.x += Math.sin(h.y * 0.008) * h.sway
        if (h.y > canvas.height + 20) {
          h.y = -20
          h.x = Math.random() * canvas.width
        }
        if (h.x > canvas.width + 20) h.x = -20
        else if (h.x < -20) h.x = canvas.width + 20
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < hearts.length; i++) {
        const h = hearts[i]
        ctx.font = `${h.size}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.globalAlpha = h.opacity
        ctx.fillText(h.char, h.x, h.y)
      }
      ctx.globalAlpha = 1
    }

    function animate() {
      update()
      draw()
      animationFrameId = requestAnimationFrame(animate)
    }

    init()
    animate()

    const handleResize = () => {
      resize()
      hearts.length = 0
      for (let i = 0; i < heartCount; i++) {
        hearts.push(createHeart())
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  return <canvas ref={canvasRef} className="hearts-canvas" />
}

export default Hearts
