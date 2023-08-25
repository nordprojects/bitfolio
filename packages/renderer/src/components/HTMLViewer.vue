<script setup lang="ts">
import { computed } from 'vue';
import { FolioFile } from '../../../main/src/DirWatcher';
import { delay, getURLForFile } from '../util';

const props = defineProps<{
  file: FolioFile
}>();

let loadResolve: () => void;
let loadReject: (err: any) => void;
const loadPromise = new Promise<void>((resolve, reject) => {
  loadResolve = resolve;
  loadReject = reject;
});

async function prepare() {
  await loadPromise;
}

async function display() {
  await delay(10000);
}

defineExpose({
  prepare,
  display,
});

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
