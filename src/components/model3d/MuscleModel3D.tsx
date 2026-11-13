import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { ThemePreference } from '@/domain/types'
import {
  addLights,
  applyThemeColors,
  cloneMannequin,
  createMaterial,
  createRenderer,
  fitCamera,
  loadMannequin,
  type MuscleUniforms,
} from './mannequin'
import type { MuscleLevel } from './models'

const STAND_CLIP = 'stand'
const ASPECT = 1
const SPACING = 0.95

interface MapStage {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.OrthographicCamera
  figures: THREE.Object3D[]
  uniforms: MuscleUniforms
  dispose: () => void
}

function createMapStage(canvas: HTMLCanvasElement, gltf: GLTF, levels: number[]): MapStage {
  const renderer = createRenderer(canvas)
  const scene = new THREE.Scene()
  addLights(scene)
  const { material, uniforms } = createMaterial(levels)
  const clip = THREE.AnimationClip.findByName(gltf.animations, STAND_CLIP)
  const figures: THREE.Object3D[] = []
  const box = new THREE.Box3()
  const roots: THREE.Object3D[] = []
  for (const [index, facing] of [0, Math.PI].entries()) {
    const { root } = cloneMannequin(gltf, material)
    if (clip) {
      const mixer = new THREE.AnimationMixer(root)
      mixer.clipAction(clip).play()
      mixer.update(0)
    }
    root.updateMatrixWorld(true)
    box.setFromObject(root, true)
    root.position.sub(box.getCenter(new THREE.Vector3()))
    const turntable = new THREE.Group()
    turntable.add(root)
    turntable.rotation.y = facing
    turntable.position.x = (index === 0 ? -1 : 1) * SPACING * 0.5
    scene.add(turntable)
    figures.push(turntable)
    roots.push(root)
  }
  const size = box.getSize(new THREE.Vector3())
  const camera = new THREE.OrthographicCamera()
  camera.position.set(0, 0.6, 5)
  camera.lookAt(0, 0, 0)
  camera.near = 0.1
  camera.far = 20
  fitCamera(camera, SPACING * 0.5 + Math.hypot(size.x, size.z) * 0.5, size.y * 0.56, ASPECT)
  return {
    renderer,
    scene,
    camera,
    figures,
    uniforms,
    dispose: () => {
      roots.forEach((root) => root.traverse((node) => (node as THREE.Mesh).geometry?.dispose()))
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}

export default function MuscleModel3D({
  levels,
  theme,
  label,
  fallback,
}: {
  levels: MuscleLevel[]
  theme: ThemePreference
  label: string
  fallback: ReactNode
}) {
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [failed, setFailed] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<MapStage | null>(null)
  const drag = useRef<{ x: number; rotation: number } | null>(null)
  const turn = useRef(0)
  const levelsKey = levels.join(',')
  const latestLevels = useRef(levels)

  useEffect(() => {
    latestLevels.current = levels
  })

  useEffect(() => {
    let active = true
    loadMannequin().then(
      (loaded) => active && setGltf(loaded),
      () => active && setFailed(true),
    )
    return () => {
      active = false
    }
  }, [])

  const render = useCallback(() => {
    const current = stage.current
    if (!current) return
    current.figures.forEach((figure, index) => (figure.rotation.y = turn.current + index * Math.PI))
    current.renderer.render(current.scene, current.camera)
  }, [])

  useEffect(() => {
    const element = canvas.current
    if (!gltf || !element || failed) return
    let created: MapStage
    try {
      created = createMapStage(element, gltf, latestLevels.current)
    } catch {
      queueMicrotask(() => setFailed(true))
      return
    }
    stage.current = created
    const resize = () => {
      const width = element.clientWidth
      created.renderer.setSize(width, width / ASPECT, false)
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const onLost = () => setFailed(true)
    element.addEventListener('webglcontextlost', onLost)
    resize()
    return () => {
      observer.disconnect()
      element.removeEventListener('webglcontextlost', onLost)
      created.dispose()
      stage.current = null
    }
  }, [gltf, failed, render])

  useEffect(() => {
    if (!stage.current) return
    stage.current.uniforms.uLevels.value = levelsKey.split(',').map(Number)
    render()
  }, [levelsKey, render])

  // Child effects run before App writes data-theme, so the new colours are
  // read on the next frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!stage.current) return
      applyThemeColors(stage.current.uniforms)
      render()
    })
    return () => cancelAnimationFrame(frame)
  }, [theme, gltf, render])

  if (failed || !gltf) return <>{fallback}</>

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={label}
      className="mx-auto block aspect-square w-full max-w-72 touch-pan-y"
      onPointerDown={(event) => {
        if (!event.isPrimary) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { x: event.clientX, rotation: turn.current }
      }}
      onPointerMove={(event) => {
        if (!drag.current || !event.isPrimary) return
        turn.current = drag.current.rotation + (event.clientX - drag.current.x) * 0.012
        render()
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    />
  )
}
