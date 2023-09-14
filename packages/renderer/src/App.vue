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
      return NoticeViewer
  }
}

type ViewerComponent = NonNullable<ReturnType<typeof componentTypeForFile>>
type ViewerInstance = InstanceType<ViewerComponent>

const currentFileIndex = ref<number>(0)
const viewers = ref<ViewerInstance[]>([])

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

  const file = fileList.value[currentFileIndex.value]

  viewerTask = new CancellableTask(async task => {
    try {
      const viewerInstance = viewers.value[currentFileIndex.value] as ViewerInstance | undefined
      if (!viewerInstance) {
        throw new Error(`No viewer available for file ${file.name}`)
      }

      await task.promise(withTimeout(5000, viewerInstance.prepare(task)))

      stage.value = 'displaying'

      await task.promise(viewerInstance.display(task))
    } catch (error: any) {
        if (task.isCancelled) {
          return
        }
        console.error('Error displaying file', file.name, error)
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

const stage = ref<'loading'|'displaying'|'fade-out'|'error'>()

const FADE_DURATION = 750
const PAUSE_BETWEEN_FILES = 750

onFileListUpdate((files) => {
  fileList.value = files

  // let the DOM update, then...
  nextTick().then(() => {
    nextFile(0).catch(console.error)
  })
})

onKeyStroke('Enter', () => {
  nextFile()
})

</script>

<template>
  <div class="app">
    <component class="file"
               v-for="(file, index) in fileList"
               :key="file.name"
               v-show="index == currentFileIndex"
               :is="componentTypeForFile(file)"
               ref="viewers"
               :file="file" />
    <template v-if="viewerError">
      <div class="error">{{ viewerError }}</div>
    </template>
    <div class="curtain" :class="[stage]"></div>
    <template v-if="fileList.length == 0">
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
.curtain {
  transition: opacity 750ms ease;
  opacity: 0;
  background-color: black;

  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  &.loading, &.fade-out {
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
