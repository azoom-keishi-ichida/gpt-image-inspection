<template>
  <USlideover v-model="isOpen" side="right">
    <UCard class="flex flex-col h-full" :ui="{ body: { padding: '' }, header: { padding: 'px-4 py-5 sm:px-6' } }">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">マスクを描画</h3>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" @click="closeDrawer" />
        </div>
      </template>

      <!-- ツールバー -->
      <div class="px-4 py-3 border-b border-gray-200">
        <div class="flex flex-wrap gap-2 mb-3">
          <UButton
            :color="tool === 'brush' ? 'primary' : 'gray'"
            variant="solid"
            size="sm"
            @click="setTool('brush')"
            icon="i-heroicons-paint-brush"
          >
            ブラシ
          </UButton>
          
          <UButton
            :color="tool === 'eraser' ? 'primary' : 'gray'"
            variant="solid"
            size="sm"
            @click="setTool('eraser')"
            icon="i-heroicons-minus-circle"
          >
            消しゴム
          </UButton>
        </div>

        <!-- ブラシサイズ調整 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-700">ブラシサイズ</label>
            <span class="text-sm text-gray-500">{{ brushSize }}px</span>
          </div>
          <URange
            v-model="brushSize"
            :min="5"
            :max="50"
            :step="1"
            class="w-full"
          />
        </div>

        <!-- 操作ボタン -->
        <div class="flex gap-2 mt-3">
          <UButton
            color="red"
            variant="outline"
            size="sm"
            @click="clearMask"
            icon="i-heroicons-trash"
            class="flex-1"
          >
            クリア
          </UButton>
          
          <UButton
            color="gray"
            variant="outline"
            size="sm"
            @click="undoLastStroke"
            icon="i-heroicons-arrow-uturn-left"
            :disabled="strokes.length === 0"
            class="flex-1"
          >
            元に戻す
          </UButton>
        </div>
      </div>

      <!-- キャンバスエリア -->
      <div class="flex-1 p-4 overflow-auto">
        <div class="relative inline-block max-w-full">
          <!-- 元画像 -->
          <img
            v-if="baseImage"
            ref="baseImageRef"
            :src="baseImage"
            class="max-w-full h-auto rounded-lg shadow-sm"
            @load="onImageLoad"
            @error="onImageError"
          />
          
          <!-- マスクオーバーレイキャンバス -->
          <canvas
            ref="maskCanvasRef"
            :width="canvasWidth"
            :height="canvasHeight"
            class="absolute top-0 left-0 cursor-crosshair rounded-lg"
            :style="canvasStyle"
            @mousedown="handleMouseDown"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @touchstart="handleTouch"
            @touchmove="handleTouch"
            @touchend="stopDrawing"
          />
        </div>
      </div>

      <!-- アクションボタン -->
      <div class="px-4 py-3 border-t border-gray-200">
        <div class="flex gap-3">
          <UButton
            variant="outline"
            color="gray"
            @click="closeDrawer"
            class="flex-1"
          >
            キャンセル
          </UButton>
          <UButton
            color="primary"
            @click="saveMask"
            :disabled="!hasMaskData"
            class="flex-1"
          >
            マスクを保存
          </UButton>
        </div>
      </div>
    </UCard>
  </USlideover>
</template>

<script setup>
// Props
const props = defineProps({
  baseImage: {
    type: String,
    default: null
  },
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'mask-created'])

// Reactive data
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const maskCanvasRef = ref(null)
const baseImageRef = ref(null)
const tool = ref('brush')
const brushSize = ref(15)
const isDrawing = ref(false)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
const strokes = ref([])
const currentStroke = ref({ points: [], tool: 'brush', brushSize: 15 })

// Computed properties
const hasMaskData = computed(() => {
  return strokes.value.length > 0
})

const canvasStyle = computed(() => {
  if (!baseImageRef.value) return {}
  
  const img = baseImageRef.value
  const rect = img.getBoundingClientRect()
  
  return {
    width: `${rect.width}px`,
    height: `${rect.height}px`
  }
})

// Methods
const setTool = (newTool) => {
  tool.value = newTool
}

const initCanvas = () => {
  if (!maskCanvasRef.value || !baseImageRef.value) return
  
  const canvas = maskCanvasRef.value
  const ctx = canvas.getContext('2d')
  
  // キャンバスを透明にクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 描画設定
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.5
}

const onImageLoad = () => {
  if (!baseImageRef.value) return
  
  const img = baseImageRef.value
  canvasWidth.value = img.naturalWidth
  canvasHeight.value = img.naturalHeight
  
  nextTick(() => {
    initCanvas()
  })
}

const onImageError = (error) => {
  console.error('Image load error:', error)
}

const getCanvasCoordinates = (e) => {
  const canvas = maskCanvasRef.value
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height
  
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

const startDrawing = (e) => {
  if (!maskCanvasRef.value) return
  
  isDrawing.value = true
  const coords = getCanvasCoordinates(e)
  currentStroke.value = {
    points: [coords],
    tool: tool.value,
    brushSize: brushSize.value
  }
  
  drawStroke(currentStroke.value)
}

const draw = (e) => {
  if (!isDrawing.value || !maskCanvasRef.value) return
  
  const coords = getCanvasCoordinates(e)
  currentStroke.value.points.push(coords)
  
  drawStroke(currentStroke.value)
}

const stopDrawing = () => {
  if (isDrawing.value && currentStroke.value.points && currentStroke.value.points.length > 0) {
    strokes.value.push({ ...currentStroke.value, points: [...currentStroke.value.points] })
    currentStroke.value = { points: [], tool: 'brush', brushSize: 15 }
  }
  isDrawing.value = false
}

const drawStroke = (stroke) => {
  if (!maskCanvasRef.value || !stroke.points || stroke.points.length === 0) return
  
  const canvas = maskCanvasRef.value
  const ctx = canvas.getContext('2d')
  
  ctx.lineWidth = stroke.brushSize || brushSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  if (stroke.tool === 'brush') {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)' // 半透明の白でマスク表示
  } else if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
  }
  
  ctx.beginPath()
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
  
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
  }
  
  ctx.stroke()
}

const redrawAllStrokes = () => {
  if (!maskCanvasRef.value) return
  
  const canvas = maskCanvasRef.value
  const ctx = canvas.getContext('2d')
  
  // キャンバスをクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // すべてのストロークを再描画
  strokes.value.forEach(stroke => {
    drawStroke(stroke)
  })
  
  // 現在のストロークも描画
  if (currentStroke.value.points && currentStroke.value.points.length > 0) {
    drawStroke(currentStroke.value)
  }
}

const handleTouch = (e) => {
  e.preventDefault()
  const touch = e.touches[0]
  if (!touch) return
  
  const mouseEvent = new MouseEvent(
    e.type === 'touchstart' ? 'mousedown' : 'mousemove',
    {
      clientX: touch.clientX,
      clientY: touch.clientY
    }
  )
  
  if (e.type === 'touchstart') {
    startDrawing(mouseEvent)
  } else if (e.type === 'touchmove') {
    draw(mouseEvent)
  }
}

const clearMask = () => {
  strokes.value = []
  currentStroke.value = { points: [], tool: 'brush', brushSize: 15 }
  redrawAllStrokes()
}

const undoLastStroke = () => {
  if (strokes.value.length > 0) {
    strokes.value.pop()
    redrawAllStrokes()
  }
}

const closeDrawer = () => {
  isOpen.value = false
}

const saveMask = () => {
  if (!maskCanvasRef.value || strokes.value.length === 0) return
  
  // マスクデータを白黒に変換
  const canvas = maskCanvasRef.value
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height
  const tempCtx = tempCanvas.getContext('2d')
  
  // 背景を黒に
  tempCtx.fillStyle = 'black'
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
  
  // マスク部分を白に
  tempCtx.globalCompositeOperation = 'source-over'
  tempCtx.strokeStyle = 'white'
  tempCtx.lineCap = 'round'
  tempCtx.lineJoin = 'round'
  
  strokes.value.forEach(stroke => {
    if (!stroke.points || stroke.points.length === 0) return
    
    tempCtx.lineWidth = stroke.brushSize || 15
    tempCtx.beginPath()
    tempCtx.moveTo(stroke.points[0].x, stroke.points[0].y)
    
    for (let i = 1; i < stroke.points.length; i++) {
      tempCtx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    
    tempCtx.stroke()
  })
  
  const dataUrl = tempCanvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  
  emit('mask-created', {
    dataUrl,
    base64
  })
  
  closeDrawer()
}

const getCursorClass = () => {
  switch (tool.value) {
    case 'brush':
      return 'cursor-crosshair'
    case 'eraser':
      return 'cursor-crosshair'
    default:
      return 'cursor-crosshair'
  }
}

// Event handlers
const handleMouseDown = (e) => {
  startDrawing(e)
}

// Lifecycle
onMounted(() => {
  if (props.baseImage) {
    nextTick(() => {
      onImageLoad()
    })
  }
})
</script>

<style scoped>
.mask-drawer {
  max-width: 100%;
}

canvas {
  touch-action: none;
}
</style>