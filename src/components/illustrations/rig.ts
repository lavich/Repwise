import type { ExerciseFrames, LimbKind, Point, Pose, Tempo } from './poses'

const ATTACH_DISTANCE = 3
const BAND_ATTACH_DISTANCE = 10
const PINNED_DISTANCE = 3

export const DEFAULT_TEMPO: Tempo = { toEnd: 1500, holdEnd: 400, toStart: 1500, holdStart: 600 }
export const MAX_CYCLES = 5

interface Anchor {
  limb: number
  point: number
}

interface AnchoredPoint {
  anchor: Anchor | null
  start: Point
  end: Point
}

interface LimbRig {
  kind: LimbKind
  far: boolean
  root: AnchoredPoint
  startAngles: number[]
  endAngles: number[]
  startLengths: number[]
  endLengths: number[]
  // Limbs whose third point stays put (a foot on the floor, a hand on the
  // floor) are solved with two-bone IK, so the contact point does not slide.
  pinned: { start: Point; end: Point; bendSign: 1 | -1 } | null
}

export interface Rig {
  limbs: LimbRig[]
  head: AnchoredPoint
  bands: AnchoredPoint[][]
  towel: AnchoredPoint | null
}

export interface ResolvedLimb {
  kind: LimbKind
  far: boolean
  points: Point[]
}

export interface ResolvedPose {
  limbs: ResolvedLimb[]
  head: Point
  bands: Point[][]
  towel: Point | null
}

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]]
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpPoint = (a: Point, b: Point, t: number): Point => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
const angleOf = (from: Point, to: Point) => Math.atan2(to[1] - from[1], to[0] - from[0])

function lerpAngle(a: number, b: number, t: number): number {
  let delta = b - a
  while (delta > Math.PI) delta -= 2 * Math.PI
  while (delta < -Math.PI) delta += 2 * Math.PI
  return a + delta * t
}

function segments(points: Point[]) {
  const angles: number[] = []
  const lengths: number[] = []
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1] as Point
    const next = points[i] as Point
    angles.push(angleOf(prev, next))
    lengths.push(distance(prev, next))
  }
  return { angles, lengths }
}

function pointAt(pose: Pose, anchor: Anchor): Point {
  const point = pose.limbs[anchor.limb]?.points[anchor.point]
  if (!point) throw new Error('Invalid anchor')
  return point
}

function findAnchor(
  start: Pose,
  end: Pose,
  startPoint: Point,
  endPoint: Point,
  maxDistance: number,
  limbs: number,
  kinds?: LimbKind[],
): Anchor | null {
  let best: { anchor: Anchor; distance: number } | null = null
  for (let limb = 0; limb < limbs; limb++) {
    const candidate = start.limbs[limb]
    if (!candidate || (kinds && !kinds.includes(candidate.kind))) continue
    candidate.points.forEach((_, point) => {
      const anchor = { limb, point }
      const d = Math.max(distance(pointAt(start, anchor), startPoint), distance(pointAt(end, anchor), endPoint))
      if (d <= maxDistance && (!best || d < best.distance)) best = { anchor, distance: d }
    })
  }
  return best ? (best as { anchor: Anchor }).anchor : null
}

function anchored(start: Pose, end: Pose, startPoint: Point, endPoint: Point, maxDistance: number, kinds?: LimbKind[]) {
  const anchor = findAnchor(start, end, startPoint, endPoint, maxDistance, start.limbs.length, kinds)
  return { anchor, start: startPoint, end: endPoint }
}

// Signed distance of the middle joint from the root–effector line.
function bendOf(points: Point[]): number {
  const [root, joint, effector] = points as [Point, Point, Point]
  const span = distance(root, effector) || 1
  const direction: Point = [(effector[0] - root[0]) / span, (effector[1] - root[1]) / span]
  const offset = sub(joint, root)
  return -direction[1] * offset[0] + direction[0] * offset[1]
}

function solveTwoBone(root: Point, target: Point, l1: number, l2: number, sign: 1 | -1): [Point, Point] {
  const span = distance(root, target)
  const reach = Math.min(Math.max(span, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01)
  const direction: Point = span === 0 ? [1, 0] : [(target[0] - root[0]) / span, (target[1] - root[1]) / span]
  const along = (l1 * l1 - l2 * l2 + reach * reach) / (2 * reach)
  const height = Math.sqrt(Math.max(0, l1 * l1 - along * along))
  const base = add(root, [direction[0] * along, direction[1] * along])
  const joint = add(base, [-direction[1] * height * sign, direction[0] * height * sign])
  const effector = add(root, [direction[0] * reach, direction[1] * reach])
  return [joint, effector]
}

export function buildRig(frames: ExerciseFrames): Rig {
  const { start, end } = frames
  if (start.limbs.length !== end.limbs.length) throw new Error('Frames differ in limbs')

  const limbs = start.limbs.map((limb, index): LimbRig => {
    const other = end.limbs[index]
    if (!other || other.points.length !== limb.points.length || other.kind !== limb.kind) {
      throw new Error(`Limb ${index} differs between frames`)
    }
    const s = segments(limb.points)
    const e = segments(other.points)
    const rootStart = limb.points[0] as Point
    const rootEnd = other.points[0] as Point
    const anchor = findAnchor(start, end, rootStart, rootEnd, ATTACH_DISTANCE, index)
    const third = limb.points[2]
    const thirdEnd = other.points[2]
    let pinned: LimbRig['pinned'] = null
    if (third && thirdEnd && distance(third, thirdEnd) <= PINNED_DISTANCE) {
      // The bend direction is read from the frame where the joint is bent
      // more: a nearly straight limb does not tell which way it folds.
      const startBend = bendOf(limb.points)
      const endBend = bendOf(other.points)
      const bendSign = Math.abs(endBend) > Math.abs(startBend) ? Math.sign(endBend) : Math.sign(startBend)
      pinned = { start: third, end: thirdEnd, bendSign: bendSign < 0 ? -1 : 1 }
    }
    return {
      kind: limb.kind,
      far: limb.far === true,
      root: { anchor, start: rootStart, end: rootEnd },
      startAngles: s.angles,
      endAngles: e.angles,
      startLengths: s.lengths,
      endLengths: e.lengths,
      pinned,
    }
  })

  const bands = (start.bands ?? []).map((line, i) =>
    line.map((point, j) =>
      anchored(start, end, point, end.bands?.[i]?.[j] ?? point, BAND_ATTACH_DISTANCE),
    ),
  )

  return {
    limbs,
    head: anchored(start, end, start.head, end.head, 20, ['torso']),
    bands,
    towel: start.towel && end.towel ? anchored(start, end, start.towel, end.towel, BAND_ATTACH_DISTANCE, ['leg']) : null,
  }
}

function resolveAnchored(point: AnchoredPoint, resolved: ResolvedLimb[], frames: ExerciseFrames, t: number): Point {
  if (!point.anchor) return lerpPoint(point.start, point.end, t)
  const base = resolved[point.anchor.limb]?.points[point.anchor.point]
  if (!base) return lerpPoint(point.start, point.end, t)
  const offset = lerpPoint(
    sub(point.start, pointAt(frames.start, point.anchor)),
    sub(point.end, pointAt(frames.end, point.anchor)),
    t,
  )
  return add(base, offset)
}

export function interpolatePose(rig: Rig, frames: ExerciseFrames, t: number): ResolvedPose {
  const limbs: ResolvedLimb[] = []
  for (const limb of rig.limbs) {
    const root = resolveAnchored(limb.root, limbs, frames, t)
    const lengths = limb.startLengths.map((l, i) => lerp(l, limb.endLengths[i] ?? l, t))
    const angles = limb.startAngles.map((a, i) => lerpAngle(a, limb.endAngles[i] ?? a, t))
    const points: Point[] = [root]
    let from = 1
    if (limb.pinned) {
      const target = lerpPoint(limb.pinned.start, limb.pinned.end, t)
      const [joint, effector] = solveTwoBone(root, target, lengths[0] ?? 0, lengths[1] ?? 0, limb.pinned.bendSign)
      points.push(joint, effector)
      from = 3
    }
    for (let i = from; i <= lengths.length; i++) {
      const prev = points[i - 1] as Point
      const angle = angles[i - 1] ?? 0
      const length = lengths[i - 1] ?? 0
      points.push([prev[0] + Math.cos(angle) * length, prev[1] + Math.sin(angle) * length])
    }
    limbs.push({ kind: limb.kind, far: limb.far, points })
  }
  return {
    limbs,
    head: resolveAnchored(rig.head, limbs, frames, t),
    bands: rig.bands.map((line) => line.map((point) => resolveAnchored(point, limbs, frames, t))),
    towel: rig.towel ? resolveAnchored(rig.towel, limbs, frames, t) : null,
  }
}

export type Phase = 'to-end' | 'hold-end' | 'to-start' | 'hold-start'

export interface CycleState {
  t: number
  phase: Phase
  finished: boolean
}

const easeInOutSine = (x: number) => (1 - Math.cos(Math.PI * x)) / 2

export function cycleAt(elapsedMs: number, tempo: Tempo = DEFAULT_TEMPO, maxCycles = MAX_CYCLES): CycleState {
  const length = tempo.toEnd + tempo.holdEnd + tempo.toStart + tempo.holdStart
  if (elapsedMs >= length * maxCycles) return { t: 0, phase: 'hold-start', finished: true }
  let s = elapsedMs % length
  if (s < tempo.toEnd) return { t: easeInOutSine(s / tempo.toEnd), phase: 'to-end', finished: false }
  s -= tempo.toEnd
  if (s < tempo.holdEnd) return { t: 1, phase: 'hold-end', finished: false }
  s -= tempo.holdEnd
  if (s < tempo.toStart) return { t: 1 - easeInOutSine(s / tempo.toStart), phase: 'to-start', finished: false }
  return { t: 0, phase: 'hold-start', finished: false }
}
