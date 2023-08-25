<script lang="ts" setup>
import {onFileListUpdate} from '#preload'
import type {FolioFile} from '../../main/src/DirWatcher';
import { computed, nextTick, ref, watchEffect } from 'vue';
import ImageViewer from './components/ImageViewer.vue';
import NoticeViewer from './components/NoticeViewer.vue';
import { delay, withTimeout, CancellableTask } from './util';

const fileList = ref<FolioFile[]>([])

function contentTypeForFile(file: FolioFile) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'image'
    case 'mp4':
    case 'webm':
    case 'mov':
      return 'video'
    default:
      return 'unknown'
  }
}

const currentFileIndex = ref<number>(0)
const file = computed<FolioFile | undefined>(() => {
  return fileList.value[currentFileIndex.value]
})

const viewerError = ref<string|null>(null)
let viewerTask: CancellableTask | null = null

async function nextFile(nextIndex?: number) {
  if (nextIndex == undefined) {
    nextIndex = (currentFileIndex.value + 1) % fileList.value.length
  }
  currentFileIndex.value = nextIndex

  viewerTask?.cancel()
  viewerTask = null

  viewerTask = new CancellableTask(async task => {
    await task.promise(nextTick())

    const viewerInstance = viewer.value
    if (!viewerInstance) {
      return
    }

    viewerError.value = null
    stage.value = 'loading'

    try {
      await task.promise(withTimeout(5000, viewerInstance.prepare()))
    } catch (err: any) {
      console.error('Error preparing viewer', err)
      viewerError.value = err.toString()
      await task.delay(5000)
      nextFile().catch(console.error)
    }

    stage.value = 'displaying'

    await task.promise(viewerInstance.display())

    stage.value = 'fade-out'

    await task.delay(FADE_DURATION + PAUSE_BETWEEN_FILES)

    nextFile().catch(console.error)
  })
}



// const { pause, resume, isActive } = useIntervalFn(() => {
//   nextFile()
// }, 5000)

onFileListUpdate((files) => {
  fileList.value = files
  nextFile(0).catch(console.error)
})

type ViewerInstance = InstanceType<typeof ImageViewer> | InstanceType<typeof NoticeViewer>

const viewer = ref<ViewerInstance>()
const stage = ref<'loading'|'displaying'|'fade-out'|'error'>()

const FADE_DURATION = 750
const PAUSE_BETWEEN_FILES = 750
// whenever(() => viewer.value?.isFinished, () => {
//   setTimeout(() => {
//     nextFile()
//   }, FADE_DURATION)
// })
watchEffect(() => {
  console.log('file', file.value?.name, 'stage', stage.value)
})

</script>

<template>
  <div class="app">
    <div v-if="file" class="viewer-container" :class="'stage-'+stage">
      <template v-if="viewerError">
        <div class="error">{{ viewerError }}</div>
      </template>
      <ImageViewer ref="viewer" v-if="contentTypeForFile(file) === 'image'" :file="file" :key="file.name" />
      <NoticeViewer ref="viewer" v-else>
        I don't know how to display {{ file.name }}
      </NoticeViewer>
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

  &.stage-displaying {
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