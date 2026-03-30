import { ref } from 'vue'

const aiEnabled = ref(false)

export const getAiEnabled = () => aiEnabled.value

export const setAiEnabled = (value: boolean) => {
  aiEnabled.value = value
}

export const aiEnabledRef = aiEnabled