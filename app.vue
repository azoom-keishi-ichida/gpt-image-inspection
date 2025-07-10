<template>
  <div class="min-h-screen bg-gray-50">
    <NuxtRouteAnnouncer />
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">
          AI画像生成・編集ツール
        </h1>
        
        <UCard class="mb-6 bg-blue-50">
          <div class="text-sm text-blue-800">
            <h3 class="font-semibold mb-2">3つのモードについて</h3>
            <div class="grid md:grid-cols-3 gap-4">
              <div class="p-3 bg-white rounded border-l-4 border-green-500">
                <h4 class="font-semibold text-green-700">🎨 画像生成</h4>
                <p class="text-xs mt-1">テキストのみ入力</p>
                <p class="text-xs">新しい画像を生成</p>
              </div>
              <div class="p-3 bg-white rounded border-l-4 border-blue-500">
                <h4 class="font-semibold text-blue-700">✏️ 画像編集</h4>
                <p class="text-xs mt-1">画像+テキスト入力</p>
                <p class="text-xs">GPT-Image-1で既存画像を編集</p>
              </div>
              <div class="p-3 bg-white rounded border-l-4 border-purple-500">
                <h4 class="font-semibold text-purple-700">🎯 部分修正（実験的）</h4>
                <p class="text-xs mt-1">画像+マスク+テキスト入力</p>
                <p class="text-xs">GPT-Image-1の制限により、マスク外も変更される場合があります</p>
              </div>
            </div>
          </div>
        </UCard>

        <UCard class="mb-6 bg-yellow-50 border-yellow-200">
          <div class="text-sm text-yellow-800">
            <h3 class="font-semibold mb-2">⚠️ 部分修正機能の重要な注意事項</h3>
            <ul class="list-disc list-inside space-y-1">
              <li><strong>GPT-Image-1の制限</strong>: 現在のGPT-Image-1モデルは厳密な部分修正をサポートしていません</li>
              <li><strong>予想される動作</strong>: マスクした部分以外も変更される可能性があります</li>
              <li><strong>推奨事項</strong>: 詳細なプロンプトで「変更しない部分」も明示的に指定してください</li>
              <li><strong>例</strong>: "猫の顔だけを犬に変更、背景と体はそのまま維持"</li>
            </ul>
          </div>
        </UCard>
        
        <UCard class="mb-6">
          <template #header>
            <h2 class="text-xl font-semibold">API設定</h2>
          </template>
          
          <div class="space-y-4">
            <UFormGroup label="OpenAI API Key" required>
              <UInput
                v-model="apiKey"
                type="password"
                placeholder="sk-..."
                :ui="{ icon: { trailing: { pointer: '' } } }"
              >
                <template #trailing>
                  <UButton
                    v-show="apiKey"
                    color="gray"
                    variant="link"
                    icon="i-heroicons-x-mark-20-solid"
                    :padded="false"
                    @click="apiKey = ''"
                  />
                </template>
              </UInput>
            </UFormGroup>
          </div>
        </UCard>

        <UCard class="mb-6">
          <template #header>
            <h2 class="text-xl font-semibold">画像アップロード & 設定</h2>
          </template>
          
          <div class="space-y-6">
            <UFormGroup :label="currentMode === 'generate' ? '画像を選択（オプション - 編集する場合）' : '画像を選択 (複数選択可)'" :required="currentMode !== 'generate'">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                @change="handleFileUpload"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </UFormGroup>

            <UFormGroup v-if="previewUrls.length > 0" label="マスク作成方法を選択">
              <div class="space-y-4">
                <!-- マスク作成方法選択 -->
                <div class="flex gap-2">
                  <UButton
                    :color="maskCreationMode === 'upload' ? 'primary' : 'gray'"
                    variant="solid"
                    size="sm"
                    @click="maskCreationMode = 'upload'"
                    icon="i-heroicons-arrow-up-tray"
                  >
                    ファイルアップロード
                  </UButton>
                  
                  <UButton
                    :color="maskCreationMode === 'draw' ? 'primary' : 'gray'"
                    variant="solid"
                    size="sm"
                    @click="maskCreationMode = 'draw'"
                    icon="i-heroicons-paint-brush"
                  >
                    画面で描画
                  </UButton>
                </div>

                <!-- ファイルアップロードモード -->
                <div v-if="maskCreationMode === 'upload'">
                  <input
                    ref="maskInput"
                    type="file"
                    accept="image/*"
                    @change="handleMaskUpload"
                    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    透明または白い部分が編集対象になります。黒い部分は変更されません。
                  </p>
                </div>

                <!-- 描画モード -->
                <div v-if="maskCreationMode === 'draw'" class="space-y-3">
                  <p class="text-sm text-gray-600">
                    選択した画像上でマスクを描画できます。最初の画像が使用されます。
                  </p>
                  
                  <UButton
                    @click="openMaskDrawer"
                    color="green"
                    variant="solid"
                    size="sm"
                    icon="i-heroicons-paint-brush"
                    :disabled="!previewUrls.length"
                  >
                    マスクを描画
                  </UButton>
                </div>
              </div>
            </UFormGroup>

            <!-- 画像プレビューエリア -->
            <div v-if="previewUrls.length > 0" class="mt-4">
              <h3 class="text-sm font-medium mb-2">選択された画像 ({{ previewUrls.length }})</h3>
              <div class="grid grid-cols-3 gap-4">
                <div v-for="(url, index) in previewUrls" :key="index" class="relative group">
                  <img 
                    :src="url" 
                    :alt="`プレビュー ${index + 1}`" 
                    class="w-full h-32 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    @click.stop="removeImage(index)"
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="画像を削除"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- マスクプレビューエリア -->
            <div v-if="maskPreviewUrl" class="mt-4">
              <h3 class="text-sm font-medium mb-2">マスク画像</h3>
              <div class="relative inline-block">
                <img 
                  :src="maskPreviewUrl" 
                  alt="マスクプレビュー" 
                  class="w-32 h-32 object-cover rounded-lg border border-green-200"
                />
                <button
                  @click="removeMask"
                  class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  title="マスクを削除"
                >
                  ×
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ maskCreationMode === 'draw' ? '描画で作成されたマスク' : 'アップロードされたマスク' }}
              </p>
            </div>

            <UFormGroup label="画像解析サイズ" required>
              <USelectMenu
                v-model="selectedSize"
                :options="sizeOptions"
                option-attribute="label"
                value-attribute="value"
              />
            </UFormGroup>

            <UFormGroup label="品質設定">
              <USelectMenu
                v-model="selectedQuality"
                :options="qualityOptions"
                option-attribute="label"
                value-attribute="value"
              />
            </UFormGroup>

            <UFormGroup label="プロンプト" required>
              <UTextarea
                v-model="prompt"
                :placeholder="getPromptPlaceholder()"
                :rows="3"
              />
            </UFormGroup>

            <!-- 現在のモード表示 -->
            <div class="p-3 rounded-lg" :class="getModeClass()">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ getModeIcon() }}</span>
                <div>
                  <p class="font-semibold">{{ getModeTitle() }}</p>
                  <p class="text-xs opacity-75">{{ getModeDescription() }}</p>
                </div>
              </div>
            </div>

            <UButton
              @click="generateImage"
              :loading="isGenerating"
              :disabled="!apiKey || !prompt"
              color="primary"
              size="lg"
              block
            >
              {{ isGenerating ? '処理中...' : getButtonText() }}
            </UButton>
          </div>
        </UCard>

        <UCard v-if="result || error">
          <template #header>
            <h2 class="text-xl font-semibold">結果</h2>
          </template>
          
          <div v-if="error" class="text-red-600 p-4 bg-red-50 rounded-lg">
            <p class="font-semibold">エラーが発生しました:</p>
            <p>{{ error }}</p>
          </div>

          <div v-if="result" class="space-y-4">
            <div class="text-center">
              <img 
                v-if="result.imageUrl" 
                :src="result.imageUrl" 
                alt="Generated Image" 
                class="max-w-full h-auto mx-auto rounded-lg shadow-lg"
              />
              <img 
                v-else-if="result.imageData && result.imageData.startsWith('data:image')" 
                :src="result.imageData" 
                alt="Generated Image" 
                class="max-w-full h-auto mx-auto rounded-lg shadow-lg"
              />
              <div v-else-if="result.rawResponse" class="p-4 bg-yellow-50 rounded-lg">
                <p class="font-semibold text-yellow-800 mb-2">APIレスポンス:</p>
                <pre class="text-sm text-gray-700 whitespace-pre-wrap">{{ result.rawResponse }}</pre>
              </div>
              <p v-else class="text-gray-500">画像の生成に失敗しました</p>
            </div>
            
            <div class="p-4 bg-green-50 rounded-lg">
              <p class="font-semibold text-green-800 mb-2">生成された画像:</p>
              <div class="text-sm text-gray-600 space-y-2">
                <p><strong>プロンプト:</strong> {{ result.originalPrompt }}</p>
                <p v-if="result.mode"><strong>モード:</strong> {{ getModeDisplayName(result.mode) }}</p>
                <p v-if="result.rawResponse && !result.imageUrl && !result.imageData">
                  <strong>レスポンス:</strong> {{ result.rawResponse }}
                </p>
                <p><strong>サイズ:</strong> {{ result.selectedSize }}</p>
                <div class="mt-3">
                  <a 
                    v-if="result.imageUrl || result.imageData" 
                    :href="result.imageUrl || result.imageData" 
                    target="_blank" 
                    class="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    フルサイズで開く
                  </a>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- マスク描画モーダル -->
        <UModal v-model="showMaskDrawer" :ui="{ width: 'max-w-6xl' }">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">マスクを描画</h3>
                <UButton
                  color="gray"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  @click="showMaskDrawer = false"
                />
              </div>
            </template>
            
            <div v-if="showMaskDrawer" class="p-4">
              <MaskDrawer
                v-if="previewUrls.length > 0"
                :base-image="previewUrls[0]"
                @mask-created="onMaskCreated"
              />
              <div v-else class="text-center py-8 text-gray-500">
                画像が選択されていません
              </div>
            </div>
          </UCard>
        </UModal>
      </div>
    </div>
  </div>
</template>

<script setup>
const apiKey = ref('')
const imageBase64 = ref([])
const previewUrls = ref([])
const maskBase64 = ref('')
const maskPreviewUrl = ref('')
const maskCreationMode = ref('upload')
const showMaskDrawer = ref(false)
const prompt = ref('美しい桜の木の下で読書する猫、水彩画風')
const selectedSize = ref('medium')
const selectedQuality = ref('medium')
const isGenerating = ref(false)
const result = ref(null)
const error = ref('')

// Template refs
const fileInput = ref(null)
const maskInput = ref(null)

const sizeOptions = computed(() => {
  if (currentMode.value === 'generate') {
    return [
      { label: 'Square (1024x1024) - 正方形', value: 'small' },
      { label: 'Portrait (1024x1792) - 縦長', value: 'medium' },
      { label: 'Landscape (1792x1024) - 横長', value: 'large' }
    ]
  } else {
    return [
      { label: 'Square (1024x1024) - 正方形', value: 'small' },
      { label: 'Portrait (1024x1536) - 縦長', value: 'medium' },
      { label: 'Landscape (1536x1024) - 横長', value: 'large' }
    ]
  }
})

const qualityOptions = computed(() => {
  if (currentMode.value === 'generate') {
    return [
      { label: 'Standard - 標準品質', value: 'standard' },
      { label: 'HD - 高品質', value: 'hd' }
    ]
  } else {
    return [
      { label: 'Low - 低品質', value: 'low' },
      { label: 'Medium - 中品質', value: 'medium' },
      { label: 'High - 高品質', value: 'high' }
    ]
  }
})

// 現在のモードを計算
const currentMode = computed(() => {
  const hasImages = imageBase64.value.length > 0
  const hasMask = maskBase64.value.length > 0
  
  if (hasImages && hasMask) {
    return 'inpaint'
  } else if (hasImages) {
    return 'edit'
  } else {
    return 'generate'
  }
})

const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files || [])
  if (!files.length) return

  // Ctrl/Cmdキーが押されていない場合は前の選択をクリア
  if (!event.ctrlKey && !event.metaKey) {
    previewUrls.value = []
    imageBase64.value = []
  }

  // 新しいファイルを処理
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsDataURL(file)
    })
    
    previewUrls.value.push(dataUrl)
    imageBase64.value.push(dataUrl.split(',')[1])
  }

  // 同じファイルを再度選択できるようにリセット
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const removeImage = (index) => {
  previewUrls.value.splice(index, 1)
  imageBase64.value.splice(index, 1)
}

const handleMaskUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file || !file.type.startsWith('image/')) return

  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })

  maskPreviewUrl.value = dataUrl
  maskBase64.value = dataUrl.split(',')[1]

  // 同じファイルを再度選択できるようにリセット
  if (maskInput.value) {
    maskInput.value.value = ''
  }
}

const removeMask = () => {
  maskPreviewUrl.value = ''
  maskBase64.value = ''
}

const openMaskDrawer = () => {
  console.log('Opening mask drawer with image:', previewUrls.value[0] ? 'available' : 'not available')
  showMaskDrawer.value = true
}

const onMaskCreated = (maskData) => {
  console.log('Mask created:', {
    hasDataUrl: !!maskData.dataUrl,
    hasMaskDataUrl: !!maskData.maskDataUrl,
    hasBase64: !!maskData.base64,
    width: maskData.width,
    height: maskData.height,
    base64Length: maskData.base64?.length
  })
  
  // プレビュー表示用は元画像そのまま
  maskPreviewUrl.value = maskData.dataUrl
  
  // API送信用はアルファチャンネル付きマスク
  maskBase64.value = maskData.base64
  
  showMaskDrawer.value = false
  maskCreationMode.value = 'draw' // 描画モードに設定
  
  console.log('Current mode after mask creation:', currentMode.value)
  console.log('Will send both original image and mask to API for inpainting')
}

// UI用のヘルパー関数
const getPromptPlaceholder = () => {
  switch (currentMode.value) {
    case 'generate':
      return '生成したい画像の説明を入力してください。例：美しい桜の木の下で読書する猫、水彩画風'
    case 'edit':
      return 'この画像をどのように編集したいか説明してください。例：背景を青空に変更、猫を犬に変更など'
    case 'inpaint':
      return 'マスクされた部分をどのように変更したいか説明してください。例：花を追加、色を変更など'
    default:
      return 'プロンプトを入力してください'
  }
}

const getModeIcon = () => {
  switch (currentMode.value) {
    case 'generate': return '🎨'
    case 'edit': return '✏️'
    case 'inpaint': return '🎯'
    default: return '🎨'
  }
}

const getModeTitle = () => {
  switch (currentMode.value) {
    case 'generate': return '画像生成モード'
    case 'edit': return '画像編集モード'
    case 'inpaint': return '部分修正モード'
    default: return '画像生成モード'
  }
}

const getModeDescription = () => {
  switch (currentMode.value) {
    case 'generate': return '新しい画像を生成します'
    case 'edit': return 'GPT-Image-1で既存の画像を編集します'
    case 'inpaint': return 'マスクした部分のみを修正します'
    default: return '新しい画像を生成します'
  }
}

const getModeClass = () => {
  switch (currentMode.value) {
    case 'generate': return 'bg-green-50 border border-green-200'
    case 'edit': return 'bg-blue-50 border border-blue-200'
    case 'inpaint': return 'bg-purple-50 border border-purple-200'
    default: return 'bg-green-50 border border-green-200'
  }
}

const getButtonText = () => {
  switch (currentMode.value) {
    case 'generate': return '画像を生成'
    case 'edit': return '画像を編集'
    case 'inpaint': return '部分修正で生成'
    default: return '画像を生成'
  }
}

const generateImage = async () => {
  if (!apiKey.value || !prompt.value) {
    error.value = 'APIキーとプロンプトが必要です'
    return
  }

  console.log('Starting image generation with mode:', currentMode.value)
  console.log('Request data:', {
    hasImages: imageBase64.value.length > 0,
    hasMask: !!maskBase64.value,
    prompt: prompt.value,
    mode: currentMode.value
  })

  isGenerating.value = true
  error.value = ''
  result.value = null

  try {
    const requestBody = {
      images: imageBase64.value,
      prompt: prompt.value,
      size: selectedSize.value,
      quality: selectedQuality.value,
      apiKey: apiKey.value,
      ...(maskBase64.value && { mask: maskBase64.value })
    }

    console.log('Sending request to API:', {
      hasImages: !!requestBody.images?.length,
      imageCount: requestBody.images?.length,
      hasMask: !!requestBody.mask,
      maskLength: requestBody.mask?.length,
      prompt: requestBody.prompt,
      size: requestBody.size,
      quality: requestBody.quality,
      mode: currentMode.value,
      apiDescription: currentMode.value === 'inpaint' ? 
        'Will send original image + pure black/white mask for inpainting' : 
        'Standard image editing'
    })

    const { data, error: apiError } = await useFetch('/api/analyze-image', {
      method: 'POST',
      body: requestBody
    })

    if (apiError.value) {
      throw new Error(apiError.value.message || 'APIエラーが発生しました')
    }

    result.value = data.value
  } catch (err) {
    console.error('Error:', err)
    error.value = err.message || '画像の生成中にエラーが発生しました'
  } finally {
    isGenerating.value = false
  }
}

const getModeDisplayName = (mode) => {
  switch (mode) {
    case 'generate': return '画像生成 (GPT-Image-1)'
    case 'edit': return '画像編集 (GPT-Image-1)'
    case 'inpaint': return '部分修正 (GPT-Image-1 + Mask)'
    default: return mode
  }
}
</script>
