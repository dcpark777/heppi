import { useEffect, useRef } from 'react'
import './Fireworks.css'

function Fireworks({ smokeEnabled = true, skipInitialDelay = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let chars, particles, ctx, w, h, current
    // Track animation start time to allow proper restart
    let animationStartTime = null
    let animationFrameId = null
    let inContinuousFireworks = false
    let lastFireworkTime = 0
    let fireworkInterval = 600  // Generate new firework every 600ms (more frequent)
    // Calculate duration to keep letters lit same time (5360ms) but with faster rocket (15% instead of 33%)
    // If explosion is 85% of total and should be 5360ms, then total = 5360 / 0.85 = 6306ms
    let duration = 6300
    let rocketPhaseRatio = 0.15  // Reduced from 0.33 to make rocket faster
    let str = ['MERRY CHRISTMAS MY JIHEE', 'I LOVE YOU BABY', 'REGULAR_FIREWORKS']
    let multilineStrings = {
      'MERRY CHRISTMAS MY JIHEE': ['MERRY', 'CHRISTMAS', 'MY JIHEE'],
      'I LOVE YOU BABY': ['I LOVE YOU', 'BABY']
    }
    let regularFireworksCount = 5  // Number of regular fireworks to display
    // Wait for Christmas tree to fully appear (lights animation takes ~2.5 seconds for 50 lights)
    // Skip delay on restart (when skipInitialDelay is true)
    let treeAppearDelay = skipInitialDelay ? 0 : 3000  // 3 seconds delay before fireworks start (only on initial load)

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
      particles = w < 400 ? 150 : 250  // Increased particle count for more detailed letters
    }

    function makeRegularFireworkParticles() {
      // Generate traditional firework explosion pattern - radial/spherical
      // Particles explode outward in all directions with realistic distribution
      let fireworkParticles = []
      // Reduce particle count slightly (about 75% of normal)
      let particleCount = Math.floor(particles * 0.75)
      
      // Create radial explosion pattern with multiple layers
      for (let i = 0; i < particleCount; i++) {
        // Evenly distribute angles around full circle for radial pattern
        let angle = (i / particleCount) * Math.PI * 2
        // Add small random variation for natural look
        angle += (Math.random() - 0.5) * 0.15
        
        // Create explosion with better dispersion - particles spread out more
        // More variation in speeds for realistic spread
        let speed = 25 + Math.random() * 70  // Wider speed range (25-95) for better dispersion
        
        // Distance variation - some particles travel much further for realistic spread
        // Use power distribution so more particles travel further (like real fireworks)
        let distanceMultiplier = 0.5 + Math.pow(Math.random(), 0.4) * 1.8  // More spread
        let distance = speed * distanceMultiplier
        
        // Add angular variation for better radial dispersion
        // Particles spread in all directions more evenly
        angle += (Math.random() - 0.5) * 0.25
        
        fireworkParticles.push({
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          speed: speed,
          angle: angle
        })
      }
      return fireworkParticles
    }

    function makeChars(t) {
      // Check if we should enter continuous fireworks mode
      let actual = parseInt(t / duration) % str.length
      let currentStr = str[actual]
      
      // Start continuous fireworks right after "I LOVE YOU" completes
      // "I LOVE YOU" is at index 1, so when we move past it (actual >= 2), start continuous mode
      if (actual >= 2 && !inContinuousFireworks) {
        inContinuousFireworks = true
        chars = []
        lastFireworkTime = t
      }
      
      // Start continuous fireworks earlier - right as "I LOVE YOU BABY" is finishing
      // Start when we're at 90% through "I LOVE YOU BABY" (1.9 * duration) to reduce lag
      if (t >= duration * 1.9 && !inContinuousFireworks) {
        inContinuousFireworks = true
        chars = []
        lastFireworkTime = t - fireworkInterval  // Start first firework immediately
      }
      
      // Also check if we're past the "I LOVE YOU BABY" duration (2 * duration)
      // This ensures we start even if the above check didn't trigger
      if (t >= duration * 2 && !inContinuousFireworks) {
        inContinuousFireworks = true
        chars = []
        lastFireworkTime = t - fireworkInterval  // Start first firework immediately
      }
      
      // If in continuous fireworks mode, generate new fireworks at intervals
      if (inContinuousFireworks) {
        // Generate new firework if enough time has passed
        if (t - lastFireworkTime >= fireworkInterval) {
          // Position fireworks around the tree (avoid center-bottom where tree is)
          // Tree is at bottom center, so position in:
          // - Very high (top of screen)
          // - Upper portion (above tree)
          // - Sides of screen (left and right of tree)
          // - Avoid center-bottom area
          let positionType = Math.random()
          let dx, dy
          
          if (positionType < 0.40) {
            // 40% chance: Very high (top of screen) - even higher
            // Note: dy uses h - y, so larger dy = higher on screen
            dx = (Math.random() * 0.8 + 0.1) * w  // 10% to 90% width
            dy = (Math.random() * 0.10 + 0.85) * h  // 85% to 95% of h = 5% to 15% from top
          } else if (positionType < 0.70) {
            // 30% chance: Upper portion (above tree) - moved even higher
            dx = (Math.random() * 0.8 + 0.1) * w  // 10% to 90% width
            dy = (Math.random() * 0.15 + 0.70) * h  // 70% to 85% of h = 15% to 30% from top
          } else if (positionType < 0.85) {
            // 15% chance: Left side (higher)
            dx = (Math.random() * 0.3 + 0.05) * w  // 5% to 35% width
            dy = (Math.random() * 0.20 + 0.60) * h  // 60% to 80% of h = 20% to 40% from top
          } else {
            // 15% chance: Right side (higher)
            dx = (Math.random() * 0.3 + 0.65) * w  // 65% to 95% width
            dy = (Math.random() * 0.20 + 0.60) * h  // 60% to 80% of h = 20% to 40% from top
          }
          
          if (!chars) chars = []
          chars.push({ 
            particles: makeRegularFireworkParticles(), 
            lineIndex: 0, 
            totalLines: 1,
            isRegular: true,
            fixedX: dx,
            fixedY: dy,
            startTime: t  // Track when this firework started
          })
          lastFireworkTime = t
        }
        // Remove old fireworks that have finished (older than duration * 0.7 for faster dissolve)
        if (chars) {
          chars = chars.filter(charData => {
            if (charData.isRegular && charData.startTime !== undefined) {
              return (t - charData.startTime) < (duration * 0.7)
            }
            return true
          })
        }
        return
      }
      
      // Normal cycling for letter fireworks
      if (current === actual && chars)
        return
      current = actual
      
      // Check if this string should be displayed on multiple lines
      if (multilineStrings[currentStr]) {
        // For multiline strings, create chars for all lines
        chars = []
        multilineStrings[currentStr].forEach((line, lineIndex) => {
          let lineChars = [...line].filter(c => c !== ' ').map(c => makeChar(c))
          // Store line index with each char set for positioning
          lineChars.forEach(charParticles => {
            chars.push({ particles: charParticles, lineIndex: lineIndex, totalLines: multilineStrings[currentStr].length, isRegular: false })
          })
        })
      } else {
        // Single line - filter out spaces and map each character
        chars = [...currentStr].filter(c => c !== ' ').map(c => ({ particles: makeChar(c), lineIndex: 0, totalLines: 1, isRegular: false }))
      }
    }

    function render(t) {
      // Calculate relative time from animation start
      // Convert requestAnimationFrame timestamp to milliseconds to match performance.now()
      let relativeTime = (t - animationStartTime)
      
      // Wait for tree to appear before starting fireworks
      if (relativeTime < treeAppearDelay) {
        animationFrameId = requestAnimationFrame(render)
        return
      }
      
      // Adjust time to account for delay
      let adjustedTime = relativeTime - treeAppearDelay
      makeChars(adjustedTime)
      animationFrameId = requestAnimationFrame(render)
      // Use rgba to match the dark blue background (#0a0e13) with higher opacity for faster fade
      // Only apply if smoke is enabled
      if (smokeEnabled) {
        ctx.fillStyle = 'rgba(10, 14, 19, 0.5)'
        ctx.fillRect(0, 0, w, h)
      } else {
        // Clear the canvas completely if smoke is disabled
        ctx.clearRect(0, 0, w, h)
      }
      if (chars && chars.length > 0) {
        chars.forEach((charData, i) => firework(adjustedTime, i, charData.particles, charData.lineIndex, charData.totalLines, charData.isRegular, charData.fixedX, charData.fixedY, charData.startTime))
      }
    }

    function firework(t, i, pts, lineIndex = 0, totalLines = 1, isRegular = false, fixedX = null, fixedY = null, startTime = null) {
      // For regular fireworks in continuous mode, use relative time from start
      if (isRegular && startTime !== null && startTime !== undefined) {
        // Use shorter duration for regular fireworks to dissolve faster
        let regularFireworkDuration = duration * 0.7  // 70% of normal duration
        let fireworkTime = t - startTime
        if (fireworkTime < 0 || fireworkTime > regularFireworkDuration) {
          return
        }
        let id = i + (startTime * 1000)  // Unique ID based on start time
        let normalizedTime = fireworkTime / regularFireworkDuration
        
        // Use fixed positions set when firework was created
        let dx = fixedX !== null ? fixedX : (Math.random() * 0.6 + 0.2) * w
        let dy = fixedY !== null ? fixedY : (Math.random() * 0.4 + 0.2) * h
        
        // Use slower rocket phase for regular fireworks (25% instead of 15%)
        let regularRocketPhaseRatio = 0.25
        if (normalizedTime < regularRocketPhaseRatio) {
          rocket(dx, dy, id, normalizedTime / regularRocketPhaseRatio)
        } else {
          regularExplosion(pts, dx, dy, id, Math.min(1, Math.max(0, (normalizedTime - regularRocketPhaseRatio) / (1 - regularRocketPhaseRatio))))
        }
        return
      }
      
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
      // Invert the formula so lineIndex 0 (first line) appears above lineIndex 1 (second line)
      if (totalLines > 1) {
        let lineSpacing = h * 0.20  // Slightly reduced spacing to keep lines closer together
        dy += ((totalLines - 1) / 2 - lineIndex) * lineSpacing
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
      let r = 2 - 2 * t + Math.pow(t, 15 * t) * 8  // Reduced from 16 to 8 for smaller explosion
      y = h - y * t
      circle(x, y, r)
    }

    function explosion(pts, x, y, id, t) {
      let dy = (t * t * t) * 20
      let r = Math.sin(id) * 0.5 + 1.5
      r = t < 0.5 ? (t + 0.5) * t * r : r - t * r
      // Maximum vibrant letters - 100% saturation for most intense colors with bright lightness (90%)
      ctx.fillStyle = `hsl(${id * 55}, 100%, 90%)`
      pts.forEach((xy, i) => {
        if (i % 20 === 0)
          ctx.fillStyle = `hsl(${id * 55}, 100%, ${90 + t * Math.sin(t * 55 + i) * 10}%)`
        circle(t * xy[0] + x, h - y + t * xy[1] + dy, r)
      })
    }

    function regularExplosion(pts, x, y, id, t) {
      // Traditional firework explosion with trails and realistic behavior
      // Gravity effect - particles fall downward
      let gravity = t * t * 20
      
      // Realistic firework colors (red, blue, green, yellow, purple, orange)
      let fireworkColors = [
        { hue: 0, sat: 100 },    // Red
        { hue: 240, sat: 100 },  // Blue
        { hue: 120, sat: 100 },  // Green
        { hue: 60, sat: 100 },   // Yellow
        { hue: 270, sat: 100 },  // Purple
        { hue: 30, sat: 100 }    // Orange
      ]
      let colorIndex = Math.floor(id) % fireworkColors.length
      let baseColor = fireworkColors[colorIndex]
      
      // Smaller particle size varies by phase
      let baseR = 0.8  // Reduced from 1.5 to 0.8 for smaller particles
      if (t < 0.2) {
        // Initial burst - particles grow
        baseR = (t / 0.2) * baseR * 1.3
      } else if (t < 0.5) {
        // Peak brightness - full size (smaller)
        baseR = baseR * 1.3
      } else {
        // Fading - particles shrink
        baseR = baseR * 1.3 * (1 - (t - 0.5) / 0.5)
      }
      
      pts.forEach((particle, i) => {
        // Handle both array format [x, y] and object format {x, y, ...}
        let px, py
        if (Array.isArray(particle)) {
          px = t * particle[0] + x
          py = h - y + t * particle[1] + gravity
        } else {
          px = t * particle.x + x
          py = h - y + t * particle.y + gravity
        }
        
        // Trail effect - draw line from previous position
        if (t > 0.1 && t < 0.8) {
          let prevT = Math.max(0, t - 0.05)
          let prevPx, prevPy
          if (Array.isArray(particle)) {
            prevPx = prevT * particle[0] + x
            prevPy = h - y + prevT * particle[1] + (prevT * prevT * 20)
          } else {
            prevPx = prevT * particle.x + x
            prevPy = h - y + prevT * particle.y + (prevT * prevT * 20)
          }
          
          // Draw trail with gradient opacity
          let trailOpacity = (0.8 - t) * 0.6
          ctx.strokeStyle = `hsla(${baseColor.hue}, ${baseColor.sat}%, 85%, ${trailOpacity})`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(prevPx, prevPy)
          ctx.lineTo(px, py)
          ctx.stroke()
        }
        
        // Particle color with sparkle effect
        let hue = baseColor.hue
        let saturation = baseColor.sat
        let lightness
        
        // Sparkle effect - occasional bright flashes
        if (i % 8 === 0 || (t > 0.2 && t < 0.6 && Math.random() < 0.15)) {
          // Bright sparkle
          hue += Math.sin(t * 25 + i) * 20
          lightness = 95 + Math.sin(t * 20 + i) * 5
        } else {
          // Normal particle
          lightness = t < 0.5 ? (85 - t * 10) : (75 - (t - 0.5) * 50)
        }
        
        // Fade out at end
        if (t > 0.7) {
          lightness *= (1 - (t - 0.7) / 0.3)
        }
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${Math.max(50, lightness)}%)`
        
        // Draw particle - smaller with more variation
        let r = baseR * (0.7 + Math.random() * 0.5)  // Size variation, but overall smaller
        circle(px, py, r)
      })
    }

    function circle(x, y, r) {
      ctx.beginPath()
      ctx.ellipse(x, y, r, r, 0, 0, 6.283)
      ctx.fill()
    }

    ctx = canvas.getContext('2d')
    resize()
    // Clear canvas immediately and fill with background
    ctx.fillStyle = 'rgba(10, 14, 19, 1)'
    ctx.fillRect(0, 0, w, h)
    // Initialize start time immediately to avoid lag
    animationStartTime = performance.now()
    // Reset continuous fireworks flag on restart
    inContinuousFireworks = false
    lastFireworkTime = 0
    // Start animation immediately instead of waiting for next frame
    animationFrameId = requestAnimationFrame(render)

    const handleResize = () => resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // Cancel any pending animation frames
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [smokeEnabled, skipInitialDelay])

  return <canvas ref={canvasRef} className="fireworks-canvas" />
}

export default Fireworks

