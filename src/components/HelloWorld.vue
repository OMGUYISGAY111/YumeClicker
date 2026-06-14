<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { X } from '@lucide/vue'
import { useAudio } from '../composables/useAudio'

const count = ref(0)
const spriteClass = ref('yume_idle_left')
const { startTicking, stopTicking } = useAudio()

let lastDir = ''
let facing = 'left'
let posX = 0
let posY = 0
let moveLoop: ReturnType<typeof setInterval> | null = null
let moveStopTimer: ReturnType<typeof setTimeout> | null = null
const heldKeys = new Set<string>()

window.win.getPos().then(([x, y]) => {
  posX = x
  posY = y
})

const dirMap: Record<string, string> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

function setSprite(state: 'idle' | 'walk', dir: string) {
  spriteClass.value = `yume_${state}_${dir}`
}

function onMove() {
  if (moveStopTimer) clearTimeout(moveStopTimer)
  startTicking()
  moveStopTimer = setTimeout(stopTicking, 200)
}

function doMove() {
  onMove()
  window.win.setPos(posX, posY)
}

function tryMove() {
  const step = 8
  switch (lastDir) {
    case 'ArrowUp': posY = Math.max(0, posY - step); break
    case 'ArrowDown': posY += step; break
    case 'ArrowLeft': posX = Math.max(0, posX - step); break
    case 'ArrowRight': posX += step; break
  }
  doMove()
}

function stopLoop() {
  if (moveLoop) {
    clearInterval(moveLoop)
    moveLoop = null
  }
  setSprite('idle', facing)
}

function startLoop() {
  if (moveLoop) return
  tryMove()
  moveLoop = setInterval(tryMove, 30)
  setSprite('walk', dirMap[lastDir] ?? 'left')
}

//keyDown event
document.addEventListener('keydown', async (e) => {

  //close window
  if (e.key === "Escape") {
    window.win.close()
    return
  }

  //click in front of character
  if (e.key === 'z' || e.key === 'Z') {
    const [wx, wy] = await window.win.getPos()
    const cx = wx + 36
    const cy = wy + 45
    const facingDir = facing
    const offset = 50
    let tx = cx, ty = cy
    switch (facingDir) {
      case 'left': tx = cx - offset; break
      case 'right': tx = cx + offset; break
      case 'up': ty = cy - offset; break
      case 'down': ty = cy + offset; break
    }
    const clickX = Math.max(0, Math.round(tx))
    const clickY = Math.max(0, Math.round(ty))
    new Audio('/sounds/decide.WAV').play()
    window.win.mouseDblClick(clickX, clickY)
    return
  }

  //move
  const dir = e.key
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(dir)) return

  heldKeys.add(dir)
  facing = dirMap[dir] ?? facing

  if (dir !== lastDir) {
    stopLoop()
    lastDir = dir
    const [x, y] = await window.win.getPos()
    posX = x
    posY = y
    startLoop()
  }
})

document.addEventListener('keyup', (e) => {
  const dir = e.key
  heldKeys.delete(dir)
  if (dir === lastDir) {
    stopLoop()
    if (heldKeys.size > 0) {
      const [nextDir] = heldKeys
      lastDir = nextDir
      facing = dirMap[nextDir] ?? facing
      startLoop()
    } else {
      lastDir = ''
      setSprite('idle', facing)
    }
  }
})

function closeWindow() {
  window.win.close();
}

onMounted(() => {
  window.win.onMoveStart(() => onMove())
  window.win.onMoveStop(() => {
    if (!moveStopTimer) stopTicking()
  })
})

onUnmounted(() => {
  stopLoop()
  if (moveStopTimer) clearTimeout(moveStopTimer)
})
</script>

<template>
  <div class="UI">
    <button @click="closeWindow" class="close-button"><X></X></button>
    <div alt="what" :class="['character', spriteClass]"></div>
  </div>
</template>
