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
          
          <!-- マスクキャンバス（非表示、API用） -->
          <canvas
            ref="maskCanvasRef"
            :width="canvasWidth"
            :height="canvasHeight"
            class="absolute inset-0 opacity-0 pointer-events-none w-full h-full object-contain"
          />
          
          <!-- プレビューキャンバス（視覚的フィードバック用） -->
          <canvas
            ref="previewCanvasRef"
            :width="canvasWidth"
            :height="canvasHeight"
            class="absolute inset-0 cursor-crosshair rounded-lg w-full h-full object-contain"
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
const previewCanvasRef = ref(null)
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
  return {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%'
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
  if (!baseImageRef.value || !maskCanvasRef.value || !previewCanvasRef.value) return
  
  const img = baseImageRef.value
  const maskCanvas = maskCanvasRef.value
  const previewCanvas = previewCanvasRef.value
  
  // キャンバスサイズを画像に合わせる
  canvasWidth.value = img.naturalWidth
  canvasHeight.value = img.naturalHeight
  
  // キャンバスを初期化
  nextTick(() => {
    // マスクキャンバス（API用）を初期化
    const maskCtx = maskCanvas.getContext('2d')
    maskCtx.fillStyle = 'rgba(0, 0, 0, 1)'
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
    
    // プレビューキャンバスをクリア
    const previewCtx = previewCanvas.getContext('2d')
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
  })
}

const onImageError = (error) => {
  console.error('Image load error:', error)
}

const getCanvasCoordinates = (e) => {
  if (!previewCanvasRef.value || !baseImageRef.value) return { x: 0, y: 0 }
  
  const canvas = previewCanvasRef.value
  const img = baseImageRef.value
  const canvasRect = canvas.getBoundingClientRect()
  const imgRect = img.getBoundingClientRect()
  
  // 画像の表示サイズと実際のサイズの比率を計算
  const scaleX = canvasWidth.value / imgRect.width
  const scaleY = canvasHeight.value / imgRect.height
  
  // マウス座標を画像基準に変換
  const x = (e.clientX - imgRect.left) * scaleX
  const y = (e.clientY - imgRect.top) * scaleY
  
  return { x, y }
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
  if (!maskCanvasRef.value || !previewCanvasRef.value || !stroke.points || stroke.points.length === 0) return
  
  const maskCanvas = maskCanvasRef.value
  const previewCanvas = previewCanvasRef.value
  const maskCtx = maskCanvas.getContext('2d')
  const previewCtx = previewCanvas.getContext('2d')
  
  const lineWidth = stroke.brushSize || brushSize.value
  
  // マスクキャンバス（API用）に描画
  maskCtx.lineWidth = lineWidth
  maskCtx.lineCap = 'round'
  maskCtx.lineJoin = 'round'
  
  if (stroke.tool === 'brush') {
    // ブラシ：透明にくり抜く（編集対象領域）
    maskCtx.globalCompositeOperation = 'destination-out'
  } else if (stroke.tool === 'eraser') {
    // 消しゴム：黒で塗り直す（保持領域に戻す）
    maskCtx.globalCompositeOperation = 'source-over'
    maskCtx.strokeStyle = 'rgba(0, 0, 0, 1)'
  }
  
  maskCtx.beginPath()
  maskCtx.moveTo(stroke.points[0].x, stroke.points[0].y)
  for (let i = 1; i < stroke.points.length; i++) {
    maskCtx.lineTo(stroke.points[i].x, stroke.points[i].y)
  }
  maskCtx.stroke()
  
  // プレビューキャンバス（視覚的フィードバック用）に描画
  previewCtx.lineWidth = lineWidth
  previewCtx.lineCap = 'round'
  previewCtx.lineJoin = 'round'
  
  if (stroke.tool === 'brush') {
    // ブラシ：半透明の白で表示
    previewCtx.globalCompositeOperation = 'source-over'
    previewCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
  } else if (stroke.tool === 'eraser') {
    // 消しゴム：描画を消去
    previewCtx.globalCompositeOperation = 'destination-out'
  }
  
  previewCtx.beginPath()
  previewCtx.moveTo(stroke.points[0].x, stroke.points[0].y)
  for (let i = 1; i < stroke.points.length; i++) {
    previewCtx.lineTo(stroke.points[i].x, stroke.points[i].y)
  }
  previewCtx.stroke()
}

const redrawAllStrokes = () => {
  if (!maskCanvasRef.value || !previewCanvasRef.value) return
  
  const maskCanvas = maskCanvasRef.value
  const previewCanvas = previewCanvasRef.value
  const maskCtx = maskCanvas.getContext('2d')
  const previewCtx = previewCanvas.getContext('2d')
  
  // マスクキャンバスをクリアして初期状態に戻す
  maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
  maskCtx.fillStyle = 'rgba(0, 0, 0, 1)'
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
  
  // プレビューキャンバスをクリア
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
  
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
  
  // 現在のマスクキャンバスをそのまま使用
  const canvas = maskCanvasRef.value
  
  // PNG形式でマスクデータを生成
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  
  console.log('Generated mask:', {
    width: canvas.width,
    height: canvas.height,
    dataUrlLength: dataUrl.length,
    base64Length: base64.length
  })
  
  emit('mask-created', {
    dataUrl,
    base64,
    width: canvas.width,
    height: canvas.height
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