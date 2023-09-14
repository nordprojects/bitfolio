<script setup lang="ts">
import { computed, ref } from 'vue';
import { FolioFile } from '../../../main/src/DirWatcher';
import { delay, getDurationTag, getURLForFile } from '../util';

const props = defineProps<{
  file: FolioFile
}>();

let loadResolve: () => void;
let loadReject: (err: any) => void;

const isIdle = ref(true);
const active = ref(false);

async function prepare() {
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
  active.value = true;
  await delay(duration.value);
  active.value = false;
}

defineExpose({
  prepare,
  display,
});

const duration = computed(() => getDurationTag(props.file.name) ?? 20000);

const url = computed(() => getURLForFile(props.file));
</script>

<template>
  <iframe
    class="html-viewer"
    :src="url"
    frameborder="0"
    @load="loadResolve()"
    @error="err => loadReject(err.toString())" />
</template>

<style lang="scss" scoped>
.html-viewer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;
}
</style>
