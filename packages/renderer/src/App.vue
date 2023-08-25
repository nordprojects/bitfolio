<script lang="ts" setup>
import {onFileListUpdate} from '#preload'
import type {FolioFile} from '../../main/src/DirWatcher';
import { computed, nextTick, onUnmounted, ref, watchEffect } from 'vue';
import ImageViewer from './components/ImageViewer.vue';
import NoticeViewer from './components/NoticeViewer.vue';
import { delay, withTimeout, CancellableTask } from './util';
import VideoViewer from './components/VideoViewer.vue';
import {onKeyStroke} from '@vueuse/core'
import HTMLViewer from './components/HTMLViewer.vue';
import ShaderViewer from './components/ShaderViewer.vue';

const fileList = ref<FolioFile[]>([])

function componentTypeForFile(file: FolioFile) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return ImageViewer
    case 'mp4':
    case 'webm':
    case 'mov':
      return VideoViewer
    case 'html':
      return HTMLViewer
    case 'glsl':
      return ShaderViewer
    default:
      return null
  }
}

type ViewerComponent = NonNullable<ReturnType<typeof componentTypeForFile>>
type ViewerInstance = InstanceType<ViewerComponent>

const currentFileIndex = ref<number>(0)
const file = computed<FolioFile | undefined>(() => {
  return fileList.value[currentFileIndex.value]
})
const viewerComponent = computed(() => {
  if (!file.value) {
    return null
  }
  return componentTypeForFile(file.value)
})

const viewerError = ref<string|null>(null)
let viewerTask: CancellableTask | null = null

async function nextFile(nextIndex?: number) {
  if (nextIndex == undefined) {
    nextIndex = (currentFileIndex.value + 1) % fileList.value.length
  }

  currentFileIndex.value = nextIndex
  viewerError.value = null
  stage.value = 'loading'

  viewerTask?.cancel()
  viewerTask = null

  viewerTask = new CancellableTask(async task => {
    await task.promise(nextTick())

    try {
      const viewerInstance = viewer.value
      if (!viewerInstance) {
        throw new Error(`No viewer available for file ${file.value?.name}`)
      }

      await task.promise(withTimeout(5000, viewerInstance.prepare()))

      stage.value = 'displaying'

      await task.promise(viewerInstance.display())
    } catch (error: any) {
        if (task.isCancelled) {
          return
        }
        console.error('Error displaying file', file.value?.name, error)
        viewerError.value = error.toString()
        stage.value = 'error'
        await task.delay(5000)
    }

    stage.value = 'fade-out'

    await task.delay(FADE_DURATION + PAUSE_BETWEEN_FILES)

    nextFile().catch(console.error)
  })
}
onUnmounted(() => {
  viewerTask?.cancel()
})

const viewer = ref<ViewerInstance>()
const stage = ref<'loading'|'displaying'|'fade-out'|'error'>()

const FADE_DURATION = 750
const PAUSE_BETWEEN_FILES = 750

onFileListUpdate((files) => {
  fileList.value = files
  nextFile(0).catch(console.error)
})

watchEffect(() => {
  console.log('file', file.value?.name, 'stage', stage.value)
})

onKeyStroke('Enter', () => {
  nextFile()
})

</script>

<template>
  <div class="app">
    <div v-if="file" class="viewer-container" :class="'stage-'+stage">
      <template v-if="viewerError">
        <div class="error">{{ viewerError }}</div>
      </template>

      <component v-if="viewerComponent != null"
                 :is="viewerComponent"
                 ref="viewer"
                 :file="file"
                 :key="file.name" />

    </div>
    <template v-else>
      <div class="no-renderer">
        No files found
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}
.viewer-container {
  transition: opacity 750ms ease;
  opacity: 0;

  &.stage-displaying, &.stage-error {
    opacity: 1;
  }
}

.error {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: grid;
  place-content: center;
  color: rgba(255, 136, 136, 0.483)
}
</style>

<style lang="scss">
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  background-color: #000;
  color: #fff;
  font-family: sans-serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
