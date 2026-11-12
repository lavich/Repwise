import { useSyncExternalStore } from 'react'
import type { AppData } from '@/domain/types'
import { createInitialData, loadData, saveData, storageEventAction } from '@/storage/storage'

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

function persist() {
  try {
    saveData(window.localStorage, data)
    saveFailed = false
  } catch (error) {
    console.error('Failed to persist data', error)
    saveFailed = true
  }
}

window.addEventListener('storage', (event) => {
  const action = storageEventAction(event.key, event.newValue)
  if (action === 'restore') persist()
  if (action === 'reload') data = readStoredData()
  if (action !== 'ignore') notify()
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
  persist()
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
