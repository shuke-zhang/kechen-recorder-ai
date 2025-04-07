<!-- "style": { "navigationBarTitleText": "柯臣" ,"navigationStyle": "custom"} -->
<route  lang="json" type="home">
  {

    "style": { "navigationBarTitleText": "柯臣" }
  }
</route>

<script setup lang="ts">
const router = useRouter()

function handleListDataPreview() {
  router.push('/feature/pages/test/index')
}
</script>

<template>
  <view class="container">
    首页

    <button @click="handleListDataPreview">
      跳转
    </button>
  </view>
</template>

<style  lang="scss">
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.recogniz {
  width: 200px;
  height: 100px;
  padding: 12px;
  margin: 50px auto;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  text-align: center;
}
.partial {
  width: 100%;
  height: 40px;
  margin-top: 16px;
  font-size: 12px;
  color: #ffffff;
}
.volume {
  width: 10px;
  height: 6px;
  border-style: solid;
  display: inline-block;
  box-sizing: border-box;
  border-width: 1px;
  border-color: #cccccc;
  border-radius: 50%;
  background-color: #00cc00;
}
.result {
  color: #cccccc;
  border: #00cccc 1px solid;
  margin: 25px auto;
  padding: 6px;
  width: 80%;
  height: 100px;
}
</style>
