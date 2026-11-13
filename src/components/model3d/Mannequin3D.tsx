import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { ExerciseMuscles, ThemePreference } from '@/domain/types'
import { PlaybackBar } from '@/components/illustrations/PlaybackBar'
import { FIGURE_WIDTH, type FigureSize } from '@/components/illustrations/figureSize'
import { useAnimationLoop, useReducedMotion } from '@/components/illustrations/useAnimationLoop'
import { cn } from '@/lib/cn'
import { addLights, applyThemeColors, cloneMannequin, createMaterial, createRenderer, fitCamera, loadMannequin, themeColor, type MuscleUniforms } from './mannequin'
import { clipTime, muscleLevels, type Model3d } from './models'

interface Stage {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.OrthographicCamera
  pivot: THREE.Group
  mixer: THREE.AnimationMixer
  action: THREE.AnimationAction
  bandLines: { line: THREE.Line; from: THREE.Object3D; to: THREE.Object3D }[]
  uniforms: MuscleUniforms
  dispose: () => void
}

// Same proportions as the flat illustration, so swapping them does not shift the layout.
const ASPECT = 160 / 136

const TURN_PER_SECOND = THREE.MathUtils.degToRad(30)

function createStage(canvas: HTMLCanvasElement, gltf: GLTF, model: Model3d, levels: number[]): Stage {
  const renderer = createRenderer(canvas)
  try {
    return buildStage(renderer, gltf, model, levels)
  } catch (error) {
    renderer.dispose()
    throw error
  }
}

function buildStage(renderer: THREE.WebGLRenderer, gltf: GLTF, model: Model3d, levels: number[]): Stage {
  const scene = new THREE.Scene()
  addLights(scene)
  const { material, uniforms } = createMaterial(levels)
  const { root, propMaterial } = cloneMannequin(gltf, material, model.props)
  const pivot = new THREE.Group()
  pivot.add(root)
  scene.add(pivot)

  const mixer = new THREE.AnimationMixer(root)
  const clip = THREE.AnimationClip.findByName(gltf.animations, model.clip)
  if (!clip) throw new Error(`Clip ${model.clip} is missing`)
  const action = mixer.clipAction(clip)
  action.play()
  action.paused = true

  const box = new THREE.Box3()
  for (const t of [0, 1]) {
    action.time = clipTime(model, t)
    mixer.update(0)
    root.updateMatrixWorld(true)
    box.expandByObject(root, true)
  }
  const center = box.getCenter(new THREE.Vector3())
  root.position.sub(center)
  const size = box.getSize(new THREE.Vector3())
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.scale.set(Math.max(size.x, 0.6), Math.max(size.z, 0.6), 1)
  shadow.position.y = box.min.y - center.y + 0.002
  pivot.add(shadow)

  const camera = new THREE.OrthographicCamera()
  const azimuth = THREE.MathUtils.degToRad(model.camera.azimuth)
  const elevation = THREE.MathUtils.degToRad(model.camera.elevation)
  camera.position.set(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)).multiplyScalar(5)
  camera.lookAt(0, 0, 0)
  camera.near = 0.1
  camera.far = 20
  // The model turns around its vertical axis, so the frame fits its
  // horizontal diagonal rather than its current width.
  fitCamera(camera, Math.hypot(size.x, size.z) * 0.52, size.y * 0.6 + 0.05, ASPECT)

  const bandLines: Stage['bandLines'] = []
  const bandMaterial = new THREE.LineBasicMaterial({ color: themeColor('--band') })
  for (const [fromName, toName] of model.bands ?? []) {
    const from = root.getObjectByName(fromName)
    const to = root.getObjectByName(toName)
    if (!from || !to) continue
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), bandMaterial)
    line.frustumCulled = false
    scene.add(line)
    bandLines.push({ line, from, to })
  }

  return {
    renderer,
    scene,
    camera,
    pivot,
    mixer,
    action,
    bandLines,
    uniforms,
    dispose: () => {
      mixer.stopAllAction()
      root.traverse((node) => (node as THREE.Mesh).geometry?.dispose())
      material.dispose()
      propMaterial.dispose()
      shadow.geometry.dispose()
      shadow.material.dispose()
      bandMaterial.dispose()
      bandLines.forEach(({ line }) => line.geometry.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}

function renderAt(stage: Stage, model: Model3d, t: number) {
  stage.action.time = clipTime(model, t)
  stage.mixer.update(0)
  stage.scene.updateMatrixWorld(true)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (const { line, from, to } of stage.bandLines) {
    from.getWorldPosition(a)
    to.getWorldPosition(b)
    line.geometry.setFromPoints([a, b])
  }
  stage.renderer.render(stage.scene, stage.camera)
}

export default function Mannequin3D({
  model,
  muscles,
  title,
  theme,
  startLabel,
  endLabel,
  fallback,
  failedFallback,
  size,
  className,
}: {
  model: Model3d
  muscles: ExerciseMuscles
  title: string
  theme: ThemePreference
  startLabel: string
  endLabel: string
  fallback: ReactNode
  failedFallback: ReactNode
  size: FigureSize
  className?: string
}) {
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [failed, setFailed] = useState(false)
  const reducedMotion = useReducedMotion()
  const container = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const caption = useRef<HTMLSpanElement>(null)
  const stage = useRef<Stage | null>(null)
  const position = useRef(0)

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

  const lastFrame = useRef<number | null>(null)
  const drag = useRef<{ x: number; rotation: number } | null>(null)
  const { playState, setPlayState } = useAnimationLoop(container, (state) => {
    if (reducedMotion || !stage.current) return
    const now = performance.now()
    // A long gap means the loop was paused or off screen: the turn resumes
    // where it stopped instead of jumping.
    const step = Math.min(lastFrame.current === null ? 0 : now - lastFrame.current, 50)
    lastFrame.current = now
    if (!drag.current) stage.current.pivot.rotation.y += (step / 1000) * TURN_PER_SECOND
    position.current = state.t
    renderAt(stage.current, model, state.t)
    if (caption.current) caption.current.textContent = state.t >= 0.5 ? endLabel : startLabel
  }, undefined, gltf !== null && !failed && !reducedMotion)

  useEffect(() => {
    const element = canvas.current
    if (!gltf || !element) return
    let created: Stage
    try {
      created = createStage(element, gltf, model, muscleLevels(muscles))
    } catch {
      queueMicrotask(() => setFailed(true))
      return
    }
    stage.current = created
    const resize = () => {
      const width = element.clientWidth
      created.renderer.setSize(width, width / ASPECT, false)
      renderAt(created, model, position.current)
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
  }, [gltf, model, muscles, failed])

  // Child effects run before App writes data-theme, so the new colours are
  // read on the next frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const current = stage.current
      if (!current) return
      applyThemeColors(current.uniforms)
      renderAt(current, model, position.current)
    })
    return () => cancelAnimationFrame(frame)
  }, [theme, gltf, model])

  useEffect(() => {
    if (!reducedMotion || !stage.current) return
    position.current = 0
    renderAt(stage.current, model, 0)
    if (caption.current) caption.current.textContent = startLabel
  }, [reducedMotion, gltf, model, startLabel])

  if (failed || (gltf && !THREE.AnimationClip.findByName(gltf.animations, model.clip))) return <>{failedFallback}</>
  if (!gltf) return <>{fallback}</>

  return (
    <div ref={container} className={cn('rounded-2xl bg-surface-2 p-3', className)}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Трёхмерная модель: ${title}`}
        className={cn('mx-auto block aspect-[160/136] w-full touch-pan-y', FIGURE_WIDTH[size])}
        onPointerDown={(event) => {
          if (!stage.current || !event.isPrimary) return
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = { x: event.clientX, rotation: stage.current.pivot.rotation.y }
        }}
        onPointerMove={(event) => {
          if (!drag.current || !stage.current || !event.isPrimary) return
          stage.current.pivot.rotation.y = drag.current.rotation + (event.clientX - drag.current.x) * 0.012
          renderAt(stage.current, model, position.current)
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      />
      <PlaybackBar
        playState={reducedMotion ? null : playState}
        onChange={setPlayState}
        caption={startLabel}
        captionRef={caption}
      />
    </div>
  )
}
