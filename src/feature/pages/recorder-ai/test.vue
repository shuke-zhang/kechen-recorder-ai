<script>
export default {
  components: {
  },
  data() {
    return {
      mapType: '',
      latLng_Renderjs: {}, // 接收视图层即renderjs中传递过来的数据
    }
  },
  onLoad() {

  },
  watch: {

    // [X]  手机端不可用，拿不到该值，inputValue下 this.clickLatlng = undefined

    latLng_Renderjs(LatLng) {
      if (LatLng.lat !== null && LatLng.lng !== null && this.inputValue.trim() !== '') {
        this.buttonDisabled = false
      }
      else {
        this.buttonDisabled = true
      }
    },
    inputValue(v) {
      const value = v.trim()
      const LatLng = this.latLng_Renderjs
      if (value !== '' && LatLng.lat !== null && LatLng.lng !== null) {
        this.buttonDisabled = false
      }
      else {
        this.buttonDisabled = true
      }
    },
  },
  methods: {

    // 接收renderjs发回的数据
    receiveRenderData(clickLatLng) {
      // console.log('receiveRenderData-->', clickLatLng);
      this.latLng_Renderjs = clickLatLng
    },

  },
}
</script>

<script module="leafletMap" lang="renderjs">
export default {
		data() {
			return {
				clickLatLng: {
					lat: null,
					lng: null
				}, //当前点击的地图坐标
				latlngs: [], //L.latLng 类型的坐标点
			}
		},
		mounted() {
			//初始化地图
			let map = L.map('map-container', {
				center: [22.612515, 113.939242],
				zoomControl: false,
				zoom: this.zoom,
				maxZoom: 18,
				minZoom: 3,
				attributionControl: false //移除右下角logo 可自定
			})
			this.map = map
		},
		methods: {
			// 发送数据到逻辑层
			postMessage(event, ownerInstance) {
				this.$ownerInstance.callMethod('receiveRenderData', this.clickLatLng)
			},

			//接收逻辑层发送的数据 选择的透明度
			getChooseOpacity(opacity) {
				this.fillOpacity = opacity
			},

			//接收逻辑层发送的数据 选择的颜色
			getChooseColor(colors) {
				this.fillColor = colors + ''
			},
			//接收逻辑层发送的数据  ⚪的半径
			getRadius(value) {
				this.radius = value
			},

			// 接收逻辑层发送的数据  当前的地图类型
			getCurrentMap(curmap) {
				this.currentMapType = curmap
			},
			// 接收逻辑层发送的数据  当前的地理位置经纬度
			getCurrLocation(location) {
				this.currLocation = location
			},

			//添加一个Circle
			setCircle() {
				this.postMessage() //将获取的定位信息传递到逻辑层
			}

		},
		watch: {
			currLocation(val) {
				if (val.length > 0) {
					this.setCurrentCenter()
				}
			},
			radius(val) {
				if (this.clickLatLng.lng !== null && this.clickLatLng.lat !== null) {
					this.setCircle()
				}
			},
			fillColor(val) {
				if (this.clickLatLng.lng !== null && this.clickLatLng.lat !== null) {
					this.setCircle()
				}
			}
		}
	}
</script>

<template>
  <view class="page">
    <view id="map-container" class="map-container" />

    <!-- renderjs 与逻辑层即普通的script之间数据交互使用 START -->
    <view
      id="renderjs-view" class="renderjs" :value="value" :change:value="leafletMap.getRadius"
      :curr-location="currentLocation" :change:currLocation="leafletMap.getCurrLocation" :current-map="mapType"
      :pick-color="chooseColor" :change:pickColor="leafletMap.getChooseColor" :pick-opacity="chooseOpacity"
      :change:pickOpacity="leafletMap.getChooseOpacity" :change:currentMap="leafletMap.getCurrentMap"
    />
    <!-- renderjs 与逻辑层即普通的script之间数据交互使用 END -->
  </view>
</template>

<style scoped>
</style>
