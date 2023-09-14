<script setup lang="ts">
import { computed, onBeforeUnmount, onUnmounted, reactive, ref, shallowRef, watchEffect } from 'vue';
import { FolioFile } from '../../../main/src/DirWatcher';
import { CancellableTask, delay, getDurationTag, getURLForFile } from '../util';
import TinyshaderEngine from '../shader-lib/TinyshaderEngine'
import {useElementSize} from '@vueuse/core'

const props = defineProps<{
  file: FolioFile
}>();

interface ShaderSettings {
  resolution: number
}

const canvas = ref<HTMLCanvasElement>();
const shaderEngine = ref<TinyshaderEngine | null>(null);
const shader = ref<{code: string, settings: ShaderSettings} | null>(null)

const canvasSize = reactive(useElementSize(canvas))

async function prepare(task: CancellableTask) {
  if (shaderEngine.value) { return }
  const shaderURL = getURLForFile(props.file)
  const shaderCode = await fetch(shaderURL).then(r => r.text())

  shader.value = {
    code: shaderCode,
    settings: {
      resolution: 400,
      ...getSettingsFromShaderCode(shaderCode),
    }
  }

  if (!canvas.value) {
    throw new Error('Canvas not ready')
  }

  if (!shaderEngine.value) {
    shaderEngine.value = new TinyshaderEngine(canvas.value)
  }

  shaderEngine.value.userCode = shaderCode
  shaderEngine.value.start()
}

watchEffect(() => {
  if (!shaderEngine.value || !shader.value) {
    return
  }
  const aspectRatio = canvasSize.width / canvasSize.height

  shaderEngine.value.overrideRenderSize = {
    width: shader.value.settings.resolution,
    height: shader.value.settings.resolution / aspectRatio,
  }
})

function getSettingsFromShaderCode(shader: string): Partial<ShaderSettings> {
  const firstLine = shader.split('\n')[0]
  if (!firstLine.startsWith('//')) {
    return {}
  }
  const settings = firstLine.slice(2).trim()
  try {
    return JSON.parse(settings)
  } catch (e) {
    console.warn('Failed to parse settings from shader code. line is: '+firstLine, e)
    return {}
  }
}

onBeforeUnmount(() => {
  shaderEngine.value?.destroy()
  shaderEngine.value = null
})

async function display(task: CancellableTask) {
  if (!shaderEngine.value) throw new Error('shader engine not set up yet')
  shaderEngine.value!.shaderTime = 0
  await task.delay(duration.value);
}

const duration = computed(() => getDurationTag(props.file.name) ?? 20000);

defineExpose({
  prepare,
  display,
});

</script>

<template>
  <div class="shader-viewer">
    <canvas class="shader-viewer" ref="canvas" />
    <div v-if="shaderEngine?.error" class="error">Error at {{ file.name }}:{{shaderEngine.error.lineNumber}}<br>{{ shaderEngine.error.message }}</div>
  </div>
</template>

<style lang="scss" scoped>
.shader-viewer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  canvas {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
  .error {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    font-family: monospace;
    display: grid;
    place-content: center;
    color: rgba(255, 163, 93, 0.483);
    background: rgba(0, 0, 0, 0.5);
    font-size: 1.5em;
    padding: 4em;
    text-align: left;
  }
}
</style>
