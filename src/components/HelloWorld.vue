<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import heroImg from '../assets/hero.png'
import { X } from '@lucide/vue'
import { useAudio } from '../composables/useAudio'

const count = ref(0)
const { startTicking, stopTicking } = useAudio()

let moving = false
let moveStopTimer: ReturnType<typeof setTimeout> | null = null

function onMove() {
  if (moveStopTimer) clearTimeout(moveStopTimer)
  startTicking()
  moveStopTimer = setTimeout(stopTicking, 200)
}

document.addEventListener('keydown', async (e) => {
  if (moving) return
  moving = true
  setTimeout(() => { moving = false }, 100)

  const moveDis = 32
  const [x, y] = await window.win.getPos()

  if (e.key === 'w' || e.key === 'W') {
    const newY = Math.max(0, y - moveDis)
    if (newY === y) { moving = false; return }
    onMove()
    window.win.smoothMove(x, newY)
  } else if (e.key === 's' || e.key === 'S') {
    onMove()
    window.win.smoothMove(x, y + moveDis)
  } else if (e.key === 'a' || e.key === 'A') {
    const newX = Math.max(0, x - moveDis)
    if (newX === x) { moving = false; return }
    onMove()
    window.win.smoothMove(newX, y)
  } else if (e.key === 'd' || e.key === 'D') {
    onMove()
    window.win.smoothMove(x + moveDis, y)
  } else if (e.key === "Escape") {
    window.win.close();
    return
  } else {
    moving = false
    return
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
  if (moveStopTimer) clearTimeout(moveStopTimer)
})
</script>

<template>
  <div class="UI">
    <button @click="closeWindow" class="close-button"><X></X></button>
    <img src="../assets/hero.png" alt="what" class="character"></img>
  </div>
</template>
