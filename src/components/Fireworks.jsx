import { useEffect, useRef } from 'react'
import './Fireworks.css'

function Fireworks() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let chars, particles, ctx, w, h, current
    let duration = 5000
    let str = ['MERRY', 'CHRISTMAS', 'I LOVE YOU']

    function makeChar(c) {
      let tmp = document.createElement('canvas')
      let size = tmp.width = tmp.height = w < 400 ? 200 : 300
      let tmpCtx = tmp.getContext('2d')
      tmpCtx.font = 'bold ' + size + 'px Arial'
      tmpCtx.fillStyle = 'white'
      tmpCtx.textBaseline = "middle"
      tmpCtx.textAlign = "center"
      tmpCtx.fillText(c, size / 2, size / 2)
      let char2 = tmpCtx.getImageData(0, 0, size, size)
      let char2particles = []
      for (var i = 0; char2particles.length < particles; i++) {
        let x = size * Math.random()
        let y = size * Math.random()
        let offset = parseInt(y) * size * 4 + parseInt(x) * 4
        if (char2.data[offset])
          char2particles.push([x - size / 2, y - size / 2])
      }
      return char2particles
    }

    function resize() {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
      particles = w < 400 ? 55 : 99
    }

    function makeChars(t) {
      let actual = parseInt(t / duration) % str.length
      if (current === actual && chars)
        return
      current = actual
      // Filter out spaces and map each character
      chars = [...str[actual]].filter(c => c !== ' ').map(makeChar)
    }

    function render(t) {
      makeChars(t)
      requestAnimationFrame(render)
      ctx.fillStyle = '#00000010'
      ctx.fillRect(0, 0, w, h)
      if (chars && chars.length > 0) {
        chars.forEach((pts, i) => firework(t, i, pts))
      }
    }

    function firework(t, i, pts) {
      // Get the current string index
      let currentStringIndex = parseInt(t / duration) % str.length
      // Calculate time within current cycle
      let cycleTime = t % duration
      
      // Stagger each firework by 200ms
      let fireworkTime = cycleTime - (i * 200)
      
      // Only render if this firework should be active (within its time window)
      if (fireworkTime < 0 || fireworkTime > duration) {
        return
      }
      
      let id = i + chars.length * currentStringIndex
      let normalizedTime = fireworkTime / duration
      let dx = (i + 1) * w / (1 + chars.length)
      dx += Math.min(0.33, normalizedTime) * 100 * Math.sin(id)
      let dy = h * 0.5
      dy += Math.sin(id * 4547.411) * h * 0.1
      if (normalizedTime < 0.33) {
        rocket(dx, dy, id, normalizedTime * 3)
      } else {
        explosion(pts, dx, dy, id, Math.min(1, Math.max(0, (normalizedTime - 0.33) * 2)))
      }
    }

    function rocket(x, y, id, t) {
      ctx.fillStyle = 'white'
      let r = 2 - 2 * t + Math.pow(t, 15 * t) * 16
      y = h - y * t
      circle(x, y, r)
    }

    function explosion(pts, x, y, id, t) {
      let dy = (t * t * t) * 20
      let r = Math.sin(id) * 1 + 3
      r = t < 0.5 ? (t + 0.5) * t * r : r - t * r
      ctx.fillStyle = `hsl(${id * 55}, 55%, 55%)`
      pts.forEach((xy, i) => {
        if (i % 20 === 0)
          ctx.fillStyle = `hsl(${id * 55}, 55%, ${55 + t * Math.sin(t * 55 + i) * 45}%)`
        circle(t * xy[0] + x, h - y + t * xy[1] + dy, r)
      })
    }

    function circle(x, y, r) {
      ctx.beginPath()
      ctx.ellipse(x, y, r, r, 0, 0, 6.283)
      ctx.fill()
    }

    ctx = canvas.getContext('2d')
    resize()
    requestAnimationFrame(render)

    const handleResize = () => resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fireworks-canvas" />
}

export default Fireworks

