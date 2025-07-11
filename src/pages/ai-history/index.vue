<route lang="json" pages="home">
  {
       "style": { "navigationBarTitleText": "历史记录" }
  }
</route>

<script setup lang="ts">
import { listChatHistory } from '@/api/chat-history'

const [state, actions] = useListData(listChatHistory)
const search = ref('')
</script>

<template>
  <search-bar
    v-model="search"
    placeholder="搜索"
    @clear="actions.onSearch"
    @confirm="actions.onSearch"
  />
  <list-data
    :actions="actions"
    :state="state"
    with-search-bar
  >
    <view v-for="(item, index) in state.list" :key="index" class="card list-data-item ">
      {{ item.assistantOutputTime }}
    </view>
  </list-data>
</template>

<style  lang="scss">
</style>
