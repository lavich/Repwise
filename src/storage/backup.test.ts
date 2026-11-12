import { describe, expect, it } from 'vitest'
import { finishWorkout, requestStop, startWorkout } from '@/domain/workoutFlow'
import { createBackup, parseBackup, serializeBackup } from './backup'
import { createInitialData } from './storage'

const NOW = '2026-11-12T10:00:00.000Z'

function dataWithHistory() {
  let data = startWorkout(createInitialData(NOW), 's1', NOW)
  data = { ...data, activeWorkout: requestStop(data.activeWorkout!) }
  data = finishWorkout(data, { rpe: 7, pain: false, notes: 'заметка' }, NOW)
  return startWorkout(data, 's2', NOW)
}

describe('import/export', () => {
  it('round-trips history through JSON without the active workout', () => {
    const data = dataWithHistory()
    expect(parseBackup(serializeBackup(createBackup(data, NOW)), NOW)).toEqual({ ok: true, data: { ...data, activeWorkout: null } })
  })

  it('rejects text that is not JSON', () => {
    expect(parseBackup('not json', NOW)).toMatchObject({ ok: false, error: expect.stringContaining('JSON') })
  })

  it('rejects JSON from another app', () => {
    expect(parseBackup(JSON.stringify({ foo: 1 }), NOW).ok).toBe(false)
  })

  it('rejects a backup with an invalid RPE', () => {
    const backup = createBackup(dataWithHistory(), NOW)
    const session = backup.data.sessions[0]!
    const broken = { ...backup, data: { ...backup.data, sessions: [{ ...session, feedback: { ...session.feedback!, rpe: 42 } }] } }
    expect(parseBackup(JSON.stringify(broken), NOW).ok).toBe(false)
  })

  it('rejects a backup with an unknown exercise', () => {
    const raw = serializeBackup(createBackup(dataWithHistory(), NOW)).replace('"band-squat"', '"leg-press"')
    expect(parseBackup(raw, NOW).ok).toBe(false)
  })

  it('rejects a step that is not on the exercise ladder', () => {
    const backup = createBackup(dataWithHistory(), NOW)
    const broken = { ...backup, data: { ...backup.data, progression: { ...backup.data.progression, 'push-up': { stepId: 'L3', updatedAt: NOW } } } }
    expect(parseBackup(JSON.stringify(broken), NOW)).toMatchObject({ ok: false, error: expect.stringContaining('ступень') })
  })

  it('fills in exercises missing from an older backup', () => {
    const backup = createBackup(dataWithHistory(), NOW)
    const { 'dead-bug': _removed, ...progression } = backup.data.progression
    const result = parseBackup(JSON.stringify({ ...backup, data: { ...backup.data, progression } }), NOW)
    expect(result.ok && result.data.progression['dead-bug'].stepId).toBe('arms-legs')
  })

  it('rejects a backup of the previous program with a clear message', () => {
    const old = JSON.stringify({ app: 'repwise', exportedAt: NOW, data: { schemaVersion: 1 } })
    expect(parseBackup(old, NOW)).toMatchObject({ ok: false, error: expect.stringContaining('прежней программы') })
  })
})
