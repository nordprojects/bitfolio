<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { FolioFile } from '../../../main/src/DirWatcher';
import { CancellableTask, ConformTag, delay, getConformTag, getDurationTag, getURLForFile } from '../util';
import { whenever } from '@vueuse/core';

const props = defineProps<{
  file: FolioFile
}>();

watch(() => props.file, () => {
  console.error('file changed', props.file);
});

let loadResolve: () => void;
let loadReject: (err: any) => void;

const isIdle = ref(true);
const active = ref(false);

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

async function display(task: CancellableTask) {
  active.value = true;
  await task.delay(duration.value);
  active.value = false;
}

const duration = computed(() => getDurationTag(props.file.name) ?? 20000);

defineExpose({
  prepare,
  display,
});

const conformMode = computed<ConformTag>(() => {
  return getConformTag(props.file.name) ?? 'fill';
});

const url = computed(() => getURLForFile(props.file));
</script>

<template>
  <div class="image-viewer" :class="'conform-mode-'+conformMode">
    <img v-if="!isIdle" :src="url" @load="loadResolve()" @error="err => loadReject(err.toString())" />
  </div>
</template>

<style lang="scss" scoped>
.image-viewer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  img {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  &.conform-mode-1-1 img {
    object-fit: none;
  }
  &.conform-mode-fit img {
    object-fit: contain;
  }
}
</style>
