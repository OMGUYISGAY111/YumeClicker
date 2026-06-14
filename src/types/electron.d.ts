export interface WinAPI {
  setSize: (w: number, h: number) => void
  minimize: () => void
  maximize: () => void
  close: () => void
  getPos: () => Promise<number[]>
  setPos: (x: number, y: number) => void
  mouseClick: (x: number, y: number, button?: 'left' | 'right') => void
  mouseDblClick: (x: number, y: number) => void
  onMoveStart: (cb: () => void) => void
  onMoveStop: (cb: () => void) => void
}

declare global {
  interface Window {
    win: WinAPI
  }
}
