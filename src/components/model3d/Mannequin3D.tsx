import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { ExerciseMuscles, ThemePreference } from '@/domain/types'
import { PlaybackBar } from '@/components/illustrations/PlaybackBar'
import { useAnimationLoop, useReducedMotion } from '@/components/illustrations/useAnimationLoop'
import { cn } from '@/lib/cn'
import { clipTime, muscleLevels, type Model3d } from './models'

const MODEL_URL = `${import.meta.env.BASE_URL}models/mannequin.glb`
let gltfPromise: Promise<GLTF> | null = null

function loadMannequin(): Promise<GLTF> {
  gltfPromise ??= new GLTFLoader().loadAsync(MODEL_URL).catch((error: unknown) => {
    gltfPromise = null
    throw error
  })
  return gltfPromise
}

function themeColor(name: string): THREE.Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return new THREE.Color(value || '#888888')
}

function createMaterial(levels: number[]) {
  const uniforms = {
    uLevels: { value: levels },
    uBody: { value: themeColor('--body-3d') },
    uSecondary: { value: themeColor('--muscle-1') },
    uPrimary: { value: themeColor('--muscle-3') },
  }
  const material = new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0 })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float _muscle;\nuniform float uLevels[16];\nvarying float vLevel;',
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLevel = uLevels[int(_muscle + 0.5)];')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uBody;\nuniform vec3 uSecondary;\nuniform vec3 uPrimary;\nvarying float vLevel;',
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec3 tint = vLevel > 1.5 ? uPrimary : vLevel > 0.5 ? uSecondary : uBody;\nvec4 diffuseColor = vec4( tint, opacity );',
      )
  }
  material.customProgramCacheKey = () => 'mannequin-muscles'
  return { material, uniforms }
}

interface Stage {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.OrthographicCamera
  pivot: THREE.Group
  mixer: THREE.AnimationMixer
  action: THREE.AnimationAction
  bandLines: { line: THREE.Line; from: THREE.Object3D; to: THREE.Object3D }[]
  uniforms: ReturnType<typeof createMaterial>['uniforms']
  dispose: () => void
}

function frameCamera(camera: THREE.OrthographicCamera, box: THREE.Box3, aspect: number) {
  const size = box.getSize(new THREE.Vector3())
  const radius = Math.max(size.x, size.y, size.z) * 0.52
  const halfHeight = Math.max(radius, radius / aspect)
  camera.left = -halfHeight * aspect
  camera.right = halfHeight * aspect
  camera.top = halfHeight
  camera.bottom = -halfHeight
  camera.updateProjectionMatrix()
}

function createStage(canvas: HTMLCanvasElement, gltf: GLTF, model: Model3d, levels: number[]): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6))
  const light = new THREE.DirectionalLight(0xffffff, 1.8)
  light.position.set(2, 4, 3)
  scene.add(light)

  const root = cloneSkinned(gltf.scene)
  const { material, uniforms } = createMaterial(levels)
  root.traverse((node) => {
    if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
      const mesh = node as THREE.SkinnedMesh
      mesh.material = material
      mesh.frustumCulled = false
    }
  })
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
  frameCamera(camera, box, 4 / 3)

  const bandLines: Stage['bandLines'] = []
  const bandMaterial = new THREE.LineBasicMaterial({ color: themeColor('--band') })
  if (model.band) {
    for (const side of ['l', 'r']) {
      const from = root.getObjectByName(`foot_${side}`)
      const to = root.getObjectByName(`hand_${side}`)
      if (!from || !to) continue
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), bandMaterial)
      line.frustumCulled = false
      scene.add(line)
      bandLines.push({ line, from, to })
    }
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
  className,
}: {
  model: Model3d
  muscles: ExerciseMuscles
  title: string
  theme: ThemePreference
  startLabel: string
  endLabel: string
  fallback: ReactNode
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

  const { playState, setPlayState } = useAnimationLoop(container, (state) => {
    if (reducedMotion || !stage.current) return
    position.current = state.t
    renderAt(stage.current, model, state.t)
    if (caption.current) caption.current.textContent = state.t >= 0.5 ? endLabel : startLabel
  }, undefined, gltf !== null && !failed)

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
      created.renderer.setSize(width, width * 0.75, false)
      renderAt(created, model, position.current)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const onLost = (event: Event) => {
      event.preventDefault()
      setFailed(true)
    }
    element.addEventListener('webglcontextlost', onLost)
    resize()
    return () => {
      observer.disconnect()
      element.removeEventListener('webglcontextlost', onLost)
      created.dispose()
      stage.current = null
    }
  }, [gltf, model, muscles])

  useEffect(() => {
    const current = stage.current
    if (!current) return
    current.uniforms.uBody.value = themeColor('--body-3d')
    current.uniforms.uSecondary.value = themeColor('--muscle-1')
    current.uniforms.uPrimary.value = themeColor('--muscle-3')
    renderAt(current, model, position.current)
  }, [theme, gltf, model])

  useEffect(() => {
    if (!reducedMotion || !stage.current) return
    position.current = 0
    renderAt(stage.current, model, 0)
  }, [reducedMotion, gltf, model])

  const drag = useRef<{ x: number; rotation: number } | null>(null)

  if (failed || !gltf || !THREE.AnimationClip.findByName(gltf.animations, model.clip)) return <>{fallback}</>

  return (
    <div ref={container} className={cn('rounded-2xl bg-surface-2 p-3', className)}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Трёхмерная модель: ${title}`}
        className="mx-auto block aspect-[4/3] w-full max-w-80 touch-pan-y"
        onPointerDown={(event) => {
          if (!stage.current) return
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = { x: event.clientX, rotation: stage.current.pivot.rotation.y }
        }}
        onPointerMove={(event) => {
          if (!drag.current || !stage.current) return
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
