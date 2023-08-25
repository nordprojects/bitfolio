<script setup lang="ts">
import { ref } from 'vue';
import { delay } from '../util'

async function prepare() {
  return
}

async function display() {
  await delay(2000);
}
defineExpose({
  prepare,
  display,
});
</script>

<template>
  <div class="notice-viewer">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.notice-viewer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: grid;
  place-content: center;
  font-size: 1rem;
  font-weight: bold;
  opacity: 0.5;
  padding: 1em;
}
</style>
