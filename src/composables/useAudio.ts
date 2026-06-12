let audio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/sounds/foot_001.wav')
    audio.loop = true
  }
  return audio
}

export function useAudio() {
  let playing = false

  function startTicking() {
    if (playing) return
    playing = true
    const a = getAudio()
    a.currentTime = 0
    a.play()
  }

  function stopTicking() {
    playing = false
    audio?.pause()
    if (audio) audio.currentTime = 0
  }

  return { startTicking, stopTicking }
}
