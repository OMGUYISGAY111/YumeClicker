<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import heroImg from '../assets/hero.png'
import { X } from '@lucide/vue'
import { useAudio } from '../composables/useAudio'

const count = ref(0)
const { startTicking, stopTicking } = useAudio()

let lastDir = ''
let posX = 0
let posY = 0
let moveLoop: ReturnType<typeof setInterval> | null = null
let moveStopTimer: ReturnType<typeof setTimeout> | null = null
const heldKeys = new Set<string>()

window.win.getPos().then(([x, y]) => {
  posX = x
  posY = y
})

function onMove() {
  if (moveStopTimer) clearTimeout(moveStopTimer)
  startTicking()
  moveStopTimer = setTimeout(stopTicking, 200)
}

function doMove() {
  onMove()
  window.win.smoothMove(posX, posY)
}

function tryMove() {
  const step = 32
  switch (lastDir) {
    case 'w': posY = Math.max(0, posY - step); break
    case 's': posY += step; break
    case 'a': posX = Math.max(0, posX - step); break
    case 'd': posX += step; break
  }
  doMove()
}

function stopLoop() {
  if (moveLoop) {
    clearInterval(moveLoop)
    moveLoop = null
  }
}

function startLoop() {
  if (moveLoop) return
  tryMove()
  moveLoop = setInterval(tryMove, 120)
}

document.addEventListener('keydown', async (e) => {
  if (e.key === "Escape") {
    window.win.close()
    return
  }

  const dir = e.key.toLowerCase()
  if (!['w', 's', 'a', 'd'].includes(dir)) return

  heldKeys.add(dir)

  if (dir !== lastDir) {
    window.win.smoothMoveCancel()
    stopLoop()
    lastDir = dir
    const [x, y] = await window.win.getPos()
    posX = x
    posY = y
    startLoop()
  }
})

document.addEventListener('keyup', (e) => {
  const dir = e.key.toLowerCase()
  heldKeys.delete(dir)
  if (dir === lastDir) {
    stopLoop()
    if (heldKeys.size > 0) {
      const [nextDir] = heldKeys
      lastDir = nextDir
      startLoop()
    } else {
      lastDir = ''
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
    <img src="../assets/hero.png" alt="what" class="character"></img>
  </div>
</template>
