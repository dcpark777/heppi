import { useEffect, useRef } from 'react'
import './Fireworks.css'

function Fireworks() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let chars, particles, ctx, w, h, current
    // Calculate duration to keep letters lit same time (5360ms) but with faster rocket (15% instead of 33%)
    // If explosion is 85% of total and should be 5360ms, then total = 5360 / 0.85 = 6306ms
    let duration = 6300
    let rocketPhaseRatio = 0.15  // Reduced from 0.33 to make rocket faster
    let str = ['MERRY', 'CHRISTMAS', 'I LOVE YOU']
    let multilineStrings = {
      'I LOVE YOU': ['YOU', 'I LOVE']
    }
    // Wait for Christmas tree to fully appear (lights animation takes ~2.5 seconds for 50 lights)
    let treeAppearDelay = 3000  // 3 seconds delay before fireworks start

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
      
      let currentStr = str[actual]
      // Check if this string should be displayed on multiple lines
      if (multilineStrings[currentStr]) {
        // For multiline strings, create chars for all lines
        chars = []
        multilineStrings[currentStr].forEach((line, lineIndex) => {
          let lineChars = [...line].filter(c => c !== ' ').map(c => makeChar(c))
          // Store line index with each char set for positioning
          lineChars.forEach(charParticles => {
            chars.push({ particles: charParticles, lineIndex: lineIndex, totalLines: multilineStrings[currentStr].length })
          })
        })
      } else {
        // Single line - filter out spaces and map each character
        chars = [...currentStr].filter(c => c !== ' ').map(c => ({ particles: makeChar(c), lineIndex: 0, totalLines: 1 }))
      }
    }

    function render(t) {
      // Wait for tree to appear before starting fireworks
      if (t < treeAppearDelay) {
        requestAnimationFrame(render)
        return
      }
      
      // Adjust time to account for delay
      let adjustedTime = t - treeAppearDelay
      makeChars(adjustedTime)
      requestAnimationFrame(render)
      ctx.fillStyle = '#00000040'
      ctx.fillRect(0, 0, w, h)
      if (chars && chars.length > 0) {
        chars.forEach((charData, i) => firework(adjustedTime, i, charData.particles, charData.lineIndex, charData.totalLines))
      }
    }

    function firework(t, i, pts, lineIndex = 0, totalLines = 1) {
      // Get the current string index
      let currentStringIndex = parseInt(t / duration) % str.length
      // Calculate time within current cycle
      let cycleTime = t % duration
      
      // For multiline strings, all fireworks start at the same time (no staggering)
      let staggerDelay = multilineStrings[str[currentStringIndex]] ? 0 : (i * 200)
      let fireworkTime = cycleTime - staggerDelay
      
      // Only render if this firework should be active (within its time window)
      if (fireworkTime < 0 || fireworkTime > duration) {
        return
      }
      
      let id = i + chars.length * currentStringIndex
      let normalizedTime = fireworkTime / duration
      
      // Calculate horizontal position
      let charsInLine = chars.filter(c => c.lineIndex === lineIndex).length
      let lineChars = chars.filter(c => c.lineIndex === lineIndex)
      let charIndexInLine = lineChars.findIndex(c => c === chars[i])
      let dx = (charIndexInLine + 1) * w / (1 + charsInLine)
      // Reduced variation for more consistent explosion positions
      dx += Math.min(rocketPhaseRatio, normalizedTime) * 30 * Math.sin(id)
      
      // Calculate vertical position - positioned well above the tree (in upper portion of screen)
      // Note: In explosion function, position is h - y, so larger dy = higher on screen
      let dy = h * 0.75  // Higher position (25% from top) to ensure letters are clearly above tree
      // For multiline, offset vertically based on line index
      if (totalLines > 1) {
        let lineSpacing = h * 0.20  // Slightly reduced spacing to keep lines closer together
        dy += (lineIndex - (totalLines - 1) / 2) * lineSpacing
      }
      // Reduced vertical variation
      dy += Math.sin(id * 4547.411) * h * 0.03
      
      if (normalizedTime < rocketPhaseRatio) {
        rocket(dx, dy, id, normalizedTime / rocketPhaseRatio)
      } else {
        explosion(pts, dx, dy, id, Math.min(1, Math.max(0, (normalizedTime - rocketPhaseRatio) / (1 - rocketPhaseRatio))))
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
      let r = Math.sin(id) * 0.5 + 1.5
      r = t < 0.5 ? (t + 0.5) * t * r : r - t * r
      // Increased brightness - higher lightness values
      ctx.fillStyle = `hsl(${id * 55}, 70%, 75%)`
      pts.forEach((xy, i) => {
        if (i % 20 === 0)
          ctx.fillStyle = `hsl(${id * 55}, 70%, ${75 + t * Math.sin(t * 55 + i) * 20}%)`
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

