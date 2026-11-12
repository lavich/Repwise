import { useSyncExternalStore } from 'react'
import type { AppData } from '@/domain/types'
import { createInitialData, isLegacyPayload, loadData, saveData, STORAGE_KEY } from '@/storage/storage'

type Listener = () => void

function readStoredData(): AppData {
  try {
    return loadData(window.localStorage, new Date().toISOString())
  } catch (error) {
    console.error('Failed to read data', error)
    saveFailed = true
    return createInitialData(new Date().toISOString())
  }
}

let saveFailed = false
let data: AppData = readStoredData()
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

window.addEventListener('storage', (event) => {
  // A tab still running the previous version writes old-format data; adopting
  // it would discard the current program, so the current data is kept.
  if (event.key !== STORAGE_KEY || isLegacyPayload(event.newValue)) return
  data = readStoredData()
  notify()
})

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getData(): AppData {
  return data
}

export function updateData(update: (current: AppData) => AppData): void {
  const next = update(data)
  if (next === data) return
  data = next
  try {
    saveData(window.localStorage, data)
    saveFailed = false
  } catch (error) {
    console.error('Failed to persist data', error)
    saveFailed = true
  }
  notify()
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getData)
}

export function useSaveFailed(): boolean {
  return useSyncExternalStore(subscribe, () => saveFailed)
}

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}
