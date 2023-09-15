<script setup lang="ts">
import { CSSProperties, StyleValue, computed, ref, watch } from 'vue';
import { FolioFile } from '../../../main/src/DirWatcher';
import { ConformTag, delay, getConformTag, getURLForFile, getDurationTag, CancellableTask } from '../util';

const props = defineProps<{
  file: FolioFile
}>();

watch(() => props.file, () => {
  console.error('file changed', props.file);
});

let loadResolve: () => void;
let loadReject: (err: any) => void;
const isIdle = ref(true);

let endedResolve: () => void;
let endedReject: (err: any) => void;


const videoElement = ref<HTMLVideoElement>();

async function prepare(task: CancellableTask) {
  if (!isIdle.value) { return }

  isIdle.value = false;
  try {
    await new Promise<void>((resolve, reject) => {
      loadResolve = resolve;
      loadReject = reject;
    });
  }
  catch (error: any) {
    isIdle.value = true;
    throw error;
  }
}

async function display() {
  const endedPromise = new Promise<void>((resolve, reject) => {
    endedResolve = resolve;
    endedReject = reject;
  });

  videoElement.value!.currentTime = 0
  videoElement.value!.play();

  try {
    if (loopingDuration.value) {
      await delay(loopingDuration.value);
    } else {
      await endedPromise;
    }
  }
  finally {
    videoElement.value?.pause()
  }
}

defineExpose({
  prepare,
  display,
});

const objectFit = computed<CSSProperties['objectFit']>(() => {
  const conformTag = getConformTag(props.file.name) ?? 'fill';
  if (conformTag == '1-1') { return 'none'; }
  if (conformTag == 'fill') { return 'cover'; }
  if (conformTag == 'fit') { return 'contain'; }
  return 'cover';
});

const loopingDuration = computed(() => getDurationTag(props.file.name))

const url = computed(() => getURLForFile(props.file));
</script>

<template>
  <video class="video-viewer"
         :src="url"
         :style="{objectFit}"
         autoplay
         muted
         ref="videoElement"
         :loop="loopingDuration != null"
         @play="loadResolve()"
         @error="ev => loadReject('video failed to load')"
         @ended="endedResolve()"
         />
</template>

<style lang="scss" scoped>
.video-viewer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;;
}
</style>
