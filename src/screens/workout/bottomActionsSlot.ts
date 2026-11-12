import { createContext } from 'react'

// Actions render into a footer outside the scrolling area, so the scrollbar
// never runs underneath them.
export const BottomActionsSlot = createContext<HTMLElement | null>(null)
