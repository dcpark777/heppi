import { useEffect, useRef } from 'react'
import './HeartAnimationBurst.css'

const SETTINGS = {
  particles: {
    length: 500,
    duration: 2,
    velocity: 100,
    effect: -0.75,
    size: 30
  }
}

function pointOnHeart(t) {
  return {
    x: 160 * Math.pow(Math.sin(t), 3),
    y:
      130 * Math.cos(t) -
      50 * Math.cos(2 * t) -
      20 * Math.cos(3 * t) -
      10 * Math.cos(4 * t) +
      25
  }
}

function createHeartImage(size) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = size
  canvas.height = size

  const scale = size / 350
  function to(t) {
    const p = pointOnHeart(t)
    return {
      x: size / 2 + (p.x * size) / 350,
      y: size / 2 - (p.y * size) / 350
    }
  }

  ctx.beginPath()
  let t = -Math.PI
  let pt = to(t)
  ctx.moveTo(pt.x, pt.y)
  while (t < Math.PI) {
    t += 0.01
    pt = to(t)
    ctx.lineTo(pt.x, pt.y)
  }
  ctx.closePath()
  ctx.fillStyle = '#ea80b0'
  ctx.fill()

  const img = new Image()
  img.src = canvas.toDataURL()
  return img
}

function HeartAnimationBurst() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const { length: poolLength, duration, velocity, effect, size: particleSize } =
      SETTINGS.particles

    const particles = []
    let firstActive = 0
    let firstFree = 0

    for (let i = 0; i < poolLength; i++) {
      particles.push({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        age: 0
      })
    }

    function addParticle(x, y, dx, dy) {
      const p = particles[firstFree]
      p.position.x = x
      p.position.y = y
      p.velocity.x = dx
      p.velocity.y = dy
      p.acceleration.x = dx * effect
      p.acceleration.y = dy * effect
      p.age = 0
      firstFree = (firstFree + 1) % poolLength
      if (firstActive === firstFree) firstActive = (firstActive + 1) % poolLength
    }

    function length(x, y) {
      return Math.sqrt(x * x + y * y)
    }
    function normalizeAndScale(x, y, len) {
      const l = length(x, y)
      if (l === 0) return { x: 0, y: 0 }
      return { x: (x / l) * len, y: (y / l) * len }
    }

    const heartImage = createHeartImage(particleSize)
    const particleRate = poolLength / duration
    let time = null
    let animationId

    function ease(t) {
      return (--t) * t * t + 1
    }

    function render() {
      animationId = requestAnimationFrame(render)
      const newTime = Date.now() / 1000
      const deltaTime = time != null ? newTime - time : 0
      time = newTime

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const amount = particleRate * deltaTime
      for (let i = 0; i < amount; i++) {
        const pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random())
        const dir = normalizeAndScale(pos.x, pos.y, velocity)
        addParticle(
          canvas.width / 2 + pos.x,
          canvas.height / 2 - pos.y,
          dir.x,
          -dir.y
        )
      }

      // Update
      let i
      if (firstActive <= firstFree) {
        for (i = firstActive; i < firstFree; i++) {
          const p = particles[i]
          p.position.x += p.velocity.x * deltaTime
          p.position.y += p.velocity.y * deltaTime
          p.velocity.x += p.acceleration.x * deltaTime
          p.velocity.y += p.acceleration.y * deltaTime
          p.age += deltaTime
        }
      } else {
        for (i = firstActive; i < poolLength; i++) {
          const p = particles[i]
          p.position.x += p.velocity.x * deltaTime
          p.position.y += p.velocity.y * deltaTime
          p.velocity.x += p.acceleration.x * deltaTime
          p.velocity.y += p.acceleration.y * deltaTime
          p.age += deltaTime
        }
        for (i = 0; i < firstFree; i++) {
          const p = particles[i]
          p.position.x += p.velocity.x * deltaTime
          p.position.y += p.velocity.y * deltaTime
          p.velocity.x += p.acceleration.x * deltaTime
          p.velocity.y += p.acceleration.y * deltaTime
          p.age += deltaTime
        }
      }
      while (particles[firstActive].age >= duration && firstActive !== firstFree) {
        firstActive = (firstActive + 1) % poolLength
      }

      // Draw
      const drawParticle = (p) => {
        const s = particleSize * ease(p.age / duration)
        ctx.globalAlpha = 1 - p.age / duration
        ctx.drawImage(
          heartImage,
          p.position.x - s / 2,
          p.position.y - s / 2,
          s,
          s
        )
      }
      if (firstActive < firstFree) {
        for (let j = firstActive; j < firstFree; j++) drawParticle(particles[j])
      } else if (firstActive !== firstFree) {
        for (let j = firstActive; j < poolLength; j++) drawParticle(particles[j])
        for (let j = 0; j < firstFree; j++) drawParticle(particles[j])
      }
      ctx.globalAlpha = 1
    }

    function resize() {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
    }

    resize()
    heartImage.onload = () => {
      render()
    }
    if (heartImage.complete && heartImage.naturalWidth) {
      render()
    }

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="heart-burst-canvas" />
}

export default HeartAnimationBurst
