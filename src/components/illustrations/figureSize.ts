export const FIGURE_WIDTH = { regular: 'max-w-72', compact: 'max-w-44' } as const
export type FigureSize = keyof typeof FIGURE_WIDTH
