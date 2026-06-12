export interface WinAPI {
  setSize: (w: number, h: number) => void
  minimize: () => void
  maximize: () => void
  close: () => void
  getPos: () => Promise<number[]>
  setPos: (x: number, y: number) => void
  smoothMove: (x: number, y: number) => void
}

declare global {
  interface Window {
    win: WinAPI
  }
}
