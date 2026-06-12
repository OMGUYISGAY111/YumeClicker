<script setup lang="ts">
import { ref } from 'vue'
import viteLogo from '../assets/vite.svg'
import heroImg from '../assets/hero.png'
import vueLogo from '../assets/vue.svg'
import { ClosedCaption, ClosedCaptionIcon, Cross, SidebarClose, X } from '@lucide/vue'

const count = ref(0)

let winX = 0
let winY = 0
let moving = false

window.win.getPos().then(([x, y]) => {
  winX = x
  winY = y
})

document.addEventListener('keydown', (e) => {

  console.log(e.key)

  if (moving) return
  moving = true
  setTimeout(() => { moving = false }, 100)

  const moveDis = 16

  if (e.key === 'w' || e.key === 'W') {
    winY = Math.max(0, winY - moveDis)
  } else if (e.key === 's' || e.key === 'S') {
    winY += moveDis
  } else if (e.key === 'a' || e.key === 'A') {
    winX = Math.max(0, winX - moveDis)
  } else if (e.key === 'd' || e.key === 'D') {
    winX += moveDis
  } else if (e.key === "Escape") {
    window.win.close();
    return
  } else {
    moving = false
    return
  }
  window.win.smoothMove(winX, winY)
})

function closeWindow() {
  window.win.close();
}

</script>

<template>
  <div class="UI">
    <button @click="closeWindow" class="close-button"><X></X></button>
    <img src="../assets/hero.png" alt="what" class="character"></img>
  </div>
</template>
