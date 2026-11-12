import { describe, expect, it } from 'vitest'
import { finishWorkout, requestStop, startWorkout } from '@/domain/workoutFlow'
import { createBackup, parseBackup, serializeBackup } from './backup'
import { createInitialData } from './storage'

const NOW = '2026-11-12T10:00:00.000Z'

function dataWithHistory() {
  let data = startWorkout(createInitialData(NOW), 's1', NOW)
  data = { ...data, activeWorkout: requestStop(data.activeWorkout!) }
  data = finishWorkout(data, { rpe: 7, pain: false, dizzinessOrNausea: false, notes: 'заметка' }, NOW)
  return startWorkout(data, 's2', NOW)
}

describe('import/export', () => {
  it('round-trips history through JSON without the active workout', () => {
    const data = dataWithHistory()
    const result = parseBackup(serializeBackup(createBackup(data, NOW)), NOW)
    expect(result).toEqual({ ok: true, data: { ...data, activeWorkout: null } })
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
    const result = parseBackup(JSON.stringify(broken), NOW)
    expect(result.ok).toBe(false)
  })

  it('fills in exercises missing from an older backup', () => {
    const backup = createBackup(dataWithHistory(), NOW)
    const { 'heel-slides': _removed, ...progression } = backup.data.progression
    const result = parseBackup(JSON.stringify({ ...backup, data: { ...backup.data, progression } }), NOW)
    expect(result.ok && result.data.progression['heel-slides'].level).toBe(1)
  })

  it('rejects a backup with an unknown exercise', () => {
    const backup = createBackup(dataWithHistory(), NOW)
    const raw = serializeBackup(backup).replace('"banded-squat"', '"push-up"')
    expect(parseBackup(raw, NOW).ok).toBe(false)
  })
})
