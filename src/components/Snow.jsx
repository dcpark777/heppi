import { useEffect, useRef } from 'react'
import './Snow.css'

function Snow() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    const flakes = []
    const flakeCount = 50 // Light snow - fewer flakes

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    function createFlake() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1, // Small flakes (1-3px)
        speed: Math.random() * 0.5 + 0.3, // Slower fall (0.3-0.8)
        opacity: Math.random() * 0.5 + 0.3, // Light/transparent (0.3-0.8)
        sway: Math.random() * 0.15 + 0.05 // Minimal side-to-side movement (less windy)
      }
    }

    function init() {
      resize()
      for (let i = 0; i < flakeCount; i++) {
        flakes.push(createFlake())
      }
    }

    function update() {
      for (let i = 0; i < flakes.length; i++) {
        const flake = flakes[i]
        
        // Move down
        flake.y += flake.speed
        
        // Minimal side-to-side sway (less windy)
        flake.x += Math.sin(flake.y * 0.005) * flake.sway
        
        // Reset if off screen
        if (flake.y > canvas.height) {
          flake.y = -10
          flake.x = Math.random() * canvas.width
        }
        
        // Wrap around horizontally
        if (flake.x > canvas.width) {
          flake.x = 0
        } else if (flake.x < 0) {
          flake.x = canvas.width
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < flakes.length; i++) {
        const flake = flakes[i]
        ctx.globalAlpha = flake.opacity
        ctx.beginPath()
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1.0
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
      // Recreate flakes on resize
      flakes.length = 0
      for (let i = 0; i < flakeCount; i++) {
        flakes.push(createFlake())
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

  return <canvas ref={canvasRef} className="snow-canvas" />
}

export default Snow

