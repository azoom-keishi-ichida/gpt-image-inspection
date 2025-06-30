<template>
  <div class="mask-drawer">
    <!-- ツールバー -->
    <div class="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
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

      <UButton
        :color="tool === 'fill' ? 'primary' : 'gray'"
        variant="solid"
        size="sm"
        @click="setTool('fill')"
        icon="i-heroicons-paint-bucket"
      >
        塗りつぶし
      </UButton>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium">サイズ:</label>
        <input
          v-model="brushSize"
          type="range"
          min="1"
          max="50"
          class="w-20"
        />
        <span class="text-sm">{{ brushSize }}px</span>
      </div>

      <UButton
        color="red"
        variant="outline"
        size="sm"
        @click="clearCanvas"
        icon="i-heroicons-trash"
      >
        クリア
      </UButton>

      <UButton
        color="blue"
        variant="outline"
        size="sm"
        @click="testFill"
        icon="i-heroicons-beaker"
      >
        塗りつぶしテスト
      </UButton>

      <UButton
        color="green"
        variant="solid"
        size="sm"
        @click="applyMask"
        icon="i-heroicons-check"
      >
        塗りつぶしを適用
      </UButton>
    </div>

    <!-- キャンバスエリア -->
    <div class="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" :style="containerStyle">
      <!-- 背景画像（非表示、サイズ取得用） -->
      <img
        v-if="baseImage"
        ref="baseImageRef"
        :src="baseImage"
        class="hidden"
        @load="onImageLoad"
        @error="onImageError"
      />
      
      <!-- 画像描画キャンバス -->
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        :class="getCursorClass()"
        class="z-10"
        :style="canvasStyle"
        @mousedown="handleMouseDown"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart="handleTouch"
        @touchmove="handleTouch"
        @touchend="stopDrawing"
      />
      
      <!-- プレビューモード -->
      <div v-if="showPreview" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div class="bg-white p-4 rounded-lg">
          <p class="font-semibold mb-2">編集プレビュー</p>
          <p class="text-sm text-gray-600 mb-3">塗りつぶした部分が黒く表示されます</p>
          <div class="flex gap-2">
            <UButton size="sm" @click="showPreview = false">編集に戻る</UButton>
            <UButton color="green" size="sm" @click="applyMask">適用</UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ヘルプテキスト -->
    <div class="mt-3 text-sm text-gray-600">
      <p><strong>使い方:</strong></p>
      <ul class="list-disc list-inside space-y-1 mt-1">
        <li>アップロードされた画像に直接塗りつぶしを行います</li>
        <li>ブラシで塗りつぶし、消しゴムで削除、塗りつぶしツールで領域を一括塗りできます</li>
        <li>塗りつぶしは同じ色の連続した領域を塗りつぶします</li>
        <li>編集された画像がそのまま出力されます</li>
        <li>モバイルでのタッチ操作にも対応しています</li>
      </ul>
      
      <div class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
        <p class="text-blue-800 font-semibold text-xs">✏️ 編集機能</p>
        <p class="text-blue-700 text-xs mt-1">
          この機能では、アップロードされた画像に直接半透明の黒色で塗りつぶしを行います。
          編集された画像は保存され、AIに送信することもできます。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  baseImage: {
    type: String,
    default: null
  },
  width: {
    type: Number,
    default: 512
  },
  height: {
    type: Number,
    default: 512
  }
})

const emit = defineEmits({
  'mask-created': (maskData) => {
    return maskData && typeof maskData === 'object' && 
           maskData.dataUrl && maskData.base64
  }
})

// リアクティブデータ
const canvasRef = ref(null)
const baseImageRef = ref(null)
const tool = ref('brush')
const brushSize = ref(20)
const isDrawing = ref(false)
const showPreview = ref(false)
const canvasWidth = ref(props.width)
const canvasHeight = ref(props.height)
const displayWidth = ref(props.width)
const displayHeight = ref(props.height)
const containerWidth = ref(800)
const containerHeight = ref(600)

let ctx = null
let lastX = 0
let lastY = 0

// スタイル計算
const containerStyle = computed(() => ({
  width: `${containerWidth.value}px`,
  height: `${containerHeight.value}px`,
  minHeight: '400px'
}))

const imageStyle = computed(() => ({
  width: `${displayWidth.value}px`,
  height: `${displayHeight.value}px`
}))

const canvasStyle = computed(() => ({
  width: `${displayWidth.value}px`,
  height: `${displayHeight.value}px`
}))

// ツールの設定
const setTool = (newTool) => {
  tool.value = newTool
}

// キャンバスの初期化
const initCanvas = () => {
  console.log('Initializing canvas...')
  
  if (!canvasRef.value) {
    console.warn('Canvas ref not available')
    return
  }
  
  try {
    ctx = canvasRef.value.getContext('2d')
    if (!ctx) {
      console.error('Failed to get 2D context')
      return
    }
    
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // 元の画像をキャンバスに描画
    if (baseImageRef.value && baseImageRef.value.complete) {
      ctx.drawImage(baseImageRef.value, 0, 0, canvasWidth.value, canvasHeight.value)
    }
    
    console.log('Canvas initialized successfully:', { 
      width: canvasWidth.value, 
      height: canvasHeight.value 
    })
  } catch (error) {
    console.error('Canvas initialization failed:', error)
  }
}

// 画像読み込み時の処理
const onImageLoad = () => {
  console.log('Image loaded successfully')
  
  if (!baseImageRef.value) {
    console.warn('baseImageRef not available')
    return
  }
  
  const img = baseImageRef.value
  console.log('Image dimensions:', { 
    natural: { width: img.naturalWidth, height: img.naturalHeight },
    display: { width: img.clientWidth, height: img.clientHeight }
  })
  
  const aspectRatio = img.naturalWidth / img.naturalHeight
  const maxDisplayWidth = 800
  const maxDisplayHeight = 600
  
  // キャンバスサイズは元画像のサイズそのままに（マスクの解像度維持）
  canvasWidth.value = img.naturalWidth
  canvasHeight.value = img.naturalHeight
  
  // 表示サイズを計算（画面内に収まるように）
  if (aspectRatio > 1) {
    // 横長の画像
    displayWidth.value = Math.min(maxDisplayWidth, img.naturalWidth)
    displayHeight.value = displayWidth.value / aspectRatio
  } else {
    // 縦長の画像
    displayHeight.value = Math.min(maxDisplayHeight, img.naturalHeight)
    displayWidth.value = displayHeight.value * aspectRatio
  }
  
  // コンテナサイズを表示サイズに合わせる
  containerWidth.value = displayWidth.value
  containerHeight.value = displayHeight.value
  
  console.log('Canvas size (actual):', { width: canvasWidth.value, height: canvasHeight.value })
  console.log('Display size:', { width: displayWidth.value, height: displayHeight.value })
  
  nextTick(() => {
    initCanvas()
  })
}

// 画像読み込みエラー時の処理
const onImageError = (error) => {
  console.error('Image load error:', error)
  console.log('Image src:', props.baseImage)
}

// マウスダウンイベント処理
const handleMouseDown = (e) => {
  const rect = canvasRef.value.getBoundingClientRect()
  
  // キャンバスの実際の表示サイズに対する実際のキャンバスサイズの比率
  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height
  
  // クリック位置をキャンバス座標に変換
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  
  console.log('Mouse down coordinates:', { 
    raw: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    scaled: { x, y },
    tool: tool.value, 
    scale: { x: scaleX, y: scaleY },
    rect: { width: rect.width, height: rect.height },
    canvas: { width: canvasWidth.value, height: canvasHeight.value }
  })
  
  if (tool.value === 'fill') {
    floodFill(x, y)
  } else {
    startDrawing(e)
  }
}

// 描画開始
const startDrawing = (e) => {
  isDrawing.value = true
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height
  lastX = (e.clientX - rect.left) * scaleX
  lastY = (e.clientY - rect.top) * scaleY
}

// 描画処理
const draw = (e) => {
  if (!isDrawing.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height
  const currentX = (e.clientX - rect.left) * scaleX
  const currentY = (e.clientY - rect.top) * scaleY
  
  // ブラシサイズもスケールに合わせて調整
  ctx.lineWidth = brushSize.value * Math.max(scaleX, scaleY)
  
  if (tool.value === 'brush') {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)' // 半透明の白で塗りつぶし
  } else if (tool.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
  }
  
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(currentX, currentY)
  ctx.stroke()
  
  lastX = currentX
  lastY = currentY
}

// 描画終了
const stopDrawing = () => {
  isDrawing.value = false
}

// タッチイベント処理
const handleTouch = (e) => {
  e.preventDefault()
  const touch = e.touches[0]
  if (!touch) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  })
  
  if (e.type === 'touchstart') {
    if (tool.value === 'fill') {
      const scaleX = canvasWidth.value / rect.width
      const scaleY = canvasHeight.value / rect.height
      const x = (touch.clientX - rect.left) * scaleX
      const y = (touch.clientY - rect.top) * scaleY
      floodFill(x, y)
    } else {
      startDrawing(mouseEvent)
    }
  } else if (e.type === 'touchmove') {
    draw(mouseEvent)
  }
}

// カーソルのスタイルを取得
const getCursorClass = () => {
  switch (tool.value) {
    case 'brush':
      return 'cursor-crosshair'
    case 'eraser':
      return 'cursor-crosshair'
    case 'fill':
      return 'cursor-pointer'
    default:
      return 'cursor-crosshair'
  }
}

// Flood Fill アルゴリズム（改良版）
const floodFill = (startX, startY) => {
  if (!ctx) {
    console.warn('Canvas context not available')
    return
  }
  
  console.log('Flood fill started at:', startX, startY)
  
  try {
    const floodFillImageData = ctx.getImageData(0, 0, canvasWidth.value, canvasHeight.value)
    const data = floodFillImageData.data
    const width = canvasWidth.value
    const height = canvasHeight.value
    
    // 開始点の座標を整数に変換
    startX = Math.floor(startX)
    startY = Math.floor(startY)
    
    // 境界チェック
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      console.warn('Click outside canvas bounds:', { startX, startY, width, height })
      return
    }
    
    // 開始点のピクセルインデックス
    const startIndex = (startY * width + startX) * 4
    
    // 元の色を取得（RGBA）
    const targetR = data[startIndex]
    const targetG = data[startIndex + 1]
    const targetB = data[startIndex + 2]
    const targetA = data[startIndex + 3]
    
    console.log('Target color at click:', { 
      r: targetR, g: targetG, b: targetB, a: targetA,
      position: { x: startX, y: startY }
    })
    
    // 塗りつぶす色（半透明の白色）
    const fillR = 255
    const fillG = 255
    const fillB = 255
    const fillA = 128
    
    // 既に同じ色の場合は何もしない
    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) {
      console.log('Target area is already filled - no change needed')
      return
    }
    
    // 色の許容範囲を設定（アンチエイリアシング対応）
    const tolerance = 10
    
    const isTargetColor = (r, g, b, a) => {
      return Math.abs(r - targetR) <= tolerance &&
             Math.abs(g - targetG) <= tolerance &&
             Math.abs(b - targetB) <= tolerance &&
             Math.abs(a - targetA) <= tolerance
    }
    
    // 訪問済みピクセルを記録
    const visited = new Set()
    const stack = [{ x: startX, y: startY }]
    let pixelsChanged = 0
    
    while (stack.length > 0) {
      const { x, y } = stack.pop()
      
      // 境界チェック
      if (x < 0 || x >= width || y < 0 || y >= height) continue
      
      const key = `${x},${y}`
      if (visited.has(key)) continue
      visited.add(key)
      
      const index = (y * width + x) * 4
      
      // 色が一致するかチェック（許容範囲内）
      if (isTargetColor(data[index], data[index + 1], data[index + 2], data[index + 3])) {
        // ピクセルを塗りつぶし
        data[index] = fillR
        data[index + 1] = fillG
        data[index + 2] = fillB
        data[index + 3] = fillA
        pixelsChanged++
        
        // 4方向の隣接ピクセルをスタックに追加
        stack.push({ x: x + 1, y: y })
        stack.push({ x: x - 1, y: y })
        stack.push({ x: x, y: y + 1 })
        stack.push({ x: x, y: y - 1 })
      }
    }
    
    console.log('Flood fill completed:', {
      pixelsChanged,
      targetColor: { r: targetR, g: targetG, b: targetB, a: targetA },
      fillColor: { r: fillR, g: fillG, b: fillB, a: fillA }
    })
    
    if (pixelsChanged === 0) {
      console.warn('No pixels were changed - check if target color is correct')
    }
    
    // 更新されたデータをキャンバスに反映
    ctx.putImageData(floodFillImageData, 0, 0)
    
  } catch (error) {
    console.error('Flood fill error:', error)
  }
}

// 塗りつぶしテスト用関数
const testFill = () => {
  if (!ctx) return
  
  // キャンバスをクリアしてテスト図形を描画
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // テスト用に簡単な図形を描画
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(50, 50, 100, 100)
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.fillRect(200, 50, 100, 100)
  
  // 透明な領域も作成（塗りつぶしテスト用）
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(350, 50, 100, 100)
  
  console.log('Test shapes drawn. Try flood fill on different areas:')
  console.log('- Black square at (50,50)')
  console.log('- Gray square at (200,50)') 
  console.log('- Transparent area at (350,50)')
  console.log('- Empty background (transparent)')
}

// キャンバスクリア
const clearCanvas = () => {
  if (!ctx) return
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // 元の画像を再描画
  if (baseImageRef.value && baseImageRef.value.complete) {
    ctx.drawImage(baseImageRef.value, 0, 0, canvasWidth.value, canvasHeight.value)
  }
}

// 塗りつぶしを適用
const applyMask = () => {
  if (!canvasRef.value) {
    console.warn('Canvas not available')
    return
  }
  
  console.log('Applying mask with canvas size:', { width: canvasWidth.value, height: canvasHeight.value })
  
  // 現在のキャンバス内容（塗りつぶしが適用された画像）
  const editedDataUrl = canvasRef.value.toDataURL('image/png')
  const editedBase64 = editedDataUrl.split(',')[1]
  
  // アルファチャンネル付きマスクデータを生成（透明部分が編集対象、不透明部分が保護対象）
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = canvasWidth.value
  maskCanvas.height = canvasHeight.value
  const maskCtx = maskCanvas.getContext('2d')
  
  // マスクキャンバスを不透明な黒で塗りつぶし（保護される部分）
  maskCtx.fillStyle = 'rgba(0, 0, 0, 1)'
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
  
  // 元のキャンバスから描画された部分を取得
  const imageData = canvasRef.value.getContext('2d').getImageData(0, 0, canvasWidth.value, canvasHeight.value)
  const data = imageData.data
  
  // 描画された部分を透明にして編集対象に設定
  const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
  const maskData = maskImageData.data
  
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha > 0) {
      // 描画された部分を透明にする（編集対象）
      maskData[i] = 0     // R
      maskData[i + 1] = 0 // G  
      maskData[i + 2] = 0 // B
      maskData[i + 3] = 0 // A (透明 = 編集対象)
    }
  }
  
  maskCtx.putImageData(maskImageData, 0, 0)
  
  const maskDataUrl = maskCanvas.toDataURL('image/png')
  const maskBase64 = maskDataUrl.split(',')[1]
  
  console.log('Mask created successfully:', {
    editedImageLength: editedBase64.length,
    maskLength: maskBase64.length,
    format: 'Alpha channel mask with transparent editing areas',
    workflow: 'Transparent areas = edit target, opaque areas = protected'
  })
  
  emit('mask-created', {
    dataUrl: editedDataUrl,     // 塗りつぶしが適用された画像（プレビュー用）
    maskDataUrl: maskDataUrl,   // アルファチャンネル付きマスクデータ
    base64: maskBase64,         // API送信用（透明部分=編集対象のマスク）
    width: canvasWidth.value,
    height: canvasHeight.value
  })
}

// props.baseImageの変更を監視
watch(() => props.baseImage, (newImage) => {
  console.log('Base image changed:', newImage ? 'Image provided' : 'No image')
  if (newImage) {
    nextTick(() => {
      if (baseImageRef.value) {
        if (baseImageRef.value.complete) {
          onImageLoad()
        }
      }
    })
  } else {
    // 画像がない場合はデフォルトサイズでキャンバスを初期化
    canvasWidth.value = 512
    canvasHeight.value = 512
    displayWidth.value = 512
    displayHeight.value = 512
    containerWidth.value = 512
    containerHeight.value = 512
    nextTick(() => {
      initCanvas()
    })
  }
}, { immediate: true })

// コンポーネントマウント時の初期化
onMounted(() => {
  console.log('MaskDrawer mounted with base image:', props.baseImage ? 'provided' : 'not provided')
  
  nextTick(() => {
    if (props.baseImage) {
      if (baseImageRef.value && baseImageRef.value.complete) {
        onImageLoad()
      }
    } else {
      canvasWidth.value = 512
      canvasHeight.value = 512
      displayWidth.value = 512
      displayHeight.value = 512
      containerWidth.value = 512
      containerHeight.value = 512
      initCanvas()
    }
  })
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