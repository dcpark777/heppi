import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import './AnimatedHeart.css'

// SVG path d from 206-Animated-Heart - heart shape viewBox 0 0 600 552
const HEART_PATH_D =
  'M300,107.77C284.68,55.67,239.76,0,162.31,0,64.83,0,0,82.08,0,171.71c0,.48,0,.95,0,1.43-.52,19.5,0,217.94,299.87,379.69v0l0,0,.05,0,0,0,0,0v0C600,391.08,600.48,192.64,600,173.14c0-.48,0-.95,0-1.43C600,82.08,535.17,0,437.69,0,360.24,0,315.32,55.67,300,107.77'

function AnimatedHeart() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Create path in memory for sampling (no DOM SVG needed)
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    pathEl.setAttribute('d', HEART_PATH_D)
    const pathLength = pathEl.getTotalLength()

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
    )
    camera.position.z = 500

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const vertices = []
    const tl = gsap.timeline({ repeat: -1, yoyo: true })

    for (let i = 0; i < pathLength; i += 0.1) {
      const point = pathEl.getPointAtLength(i)
      const vector = new THREE.Vector3(point.x, -point.y, 0)
      vector.x += (Math.random() - 0.5) * 30
      vector.y += (Math.random() - 0.5) * 30
      vector.z += (Math.random() - 0.5) * 70
      vertices.push(vector)
      tl.from(
        vector,
        {
          x: 600 / 2,
          y: -552 / 2,
          z: 0,
          ease: 'power2.inOut',
          duration: 'random(2, 5)'
        },
        i * 0.002
      )
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(vertices)
    const material = new THREE.PointsMaterial({
      color: 0xee5282,
      blending: THREE.AdditiveBlending,
      size: 3,
      depthWrite: false
    })
    const particles = new THREE.Points(geometry, material)
    particles.position.x -= 600 / 2
    particles.position.y += 552 / 2
    scene.add(particles)

    gsap.fromTo(
      scene.rotation,
      { y: -0.2 },
      { y: 0.2, repeat: -1, yoyo: true, ease: 'power2.inOut', duration: 3 }
    )

    let animationFrameId
    function render() {
      animationFrameId = requestAnimationFrame(render)
      geometry.setFromPoints(vertices)
      renderer.render(scene, camera)
    }
    render()

    function onResize() {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      tl.kill()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className="animated-heart-container" />
}

export default AnimatedHeart
