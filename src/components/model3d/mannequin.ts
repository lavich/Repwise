import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

const MODEL_URL = `${import.meta.env.BASE_URL}models/mannequin.glb`
let gltfPromise: Promise<GLTF> | null = null

export function loadMannequin(): Promise<GLTF> {
  gltfPromise ??= new GLTFLoader().loadAsync(MODEL_URL).catch((error: unknown) => {
    gltfPromise = null
    throw error
  })
  return gltfPromise
}

export function themeColor(name: string): THREE.Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return new THREE.Color(value || '#888888')
}

export function createMaterial(levels: number[]) {
  const uniforms = {
    uLevels: { value: levels },
    uBody: { value: themeColor('--body-3d') },
    uMuscle1: { value: themeColor('--muscle-1') },
    uMuscle2: { value: themeColor('--muscle-2') },
    uMuscle3: { value: themeColor('--muscle-3') },
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
        '#include <common>\nuniform vec3 uBody;\nuniform vec3 uMuscle1;\nuniform vec3 uMuscle2;\nuniform vec3 uMuscle3;\nvarying float vLevel;',
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec3 tint = vLevel > 2.5 ? uMuscle3 : vLevel > 1.5 ? uMuscle2 : vLevel > 0.5 ? uMuscle1 : uBody;\nvec4 diffuseColor = vec4( tint, opacity );',
      )
  }
  material.customProgramCacheKey = () => 'mannequin-muscles'
  return { material, uniforms }
}

export type MuscleUniforms = ReturnType<typeof createMaterial>['uniforms']

export function applyThemeColors(uniforms: MuscleUniforms) {
  uniforms.uBody.value = themeColor('--body-3d')
  uniforms.uMuscle1.value = themeColor('--muscle-1')
  uniforms.uMuscle2.value = themeColor('--muscle-2')
  uniforms.uMuscle3.value = themeColor('--muscle-3')
}

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  return renderer
}

export function addLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6))
  const light = new THREE.DirectionalLight(0xffffff, 1.8)
  light.position.set(2, 4, 3)
  scene.add(light)
}

// Each view gets its own clone: a skinned mesh and its skeleton cannot be
// shared between scenes, while the parsed glTF stays cached.
export function cloneMannequin(gltf: GLTF, material: THREE.Material, props: readonly string[] = []) {
  const root = cloneSkinned(gltf.scene)
  const unused: THREE.Object3D[] = []
  const propMaterial = new THREE.MeshStandardMaterial({ color: themeColor('--muted'), roughness: 0.9 })
  root.traverse((node) => {
    if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
      const mesh = node as THREE.SkinnedMesh
      mesh.material = material
      mesh.frustumCulled = false
    } else if (node.name.startsWith('prop_')) {
      if (props.includes(node.name)) (node as THREE.Mesh).material = propMaterial
      else unused.push(node)
    }
  })
  unused.forEach((node) => node.removeFromParent())
  return { root, propMaterial }
}

export function fitCamera(camera: THREE.OrthographicCamera, halfWidth: number, halfHeight: number, aspect: number) {
  const height = Math.max(halfHeight, halfWidth / aspect)
  camera.left = -height * aspect
  camera.right = height * aspect
  camera.top = height
  camera.bottom = -height
  camera.updateProjectionMatrix()
}
