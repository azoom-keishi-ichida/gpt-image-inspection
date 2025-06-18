<template>
  <div class="min-h-screen bg-gray-50">
    <NuxtRouteAnnouncer />
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">
          GPT-Image-1 テスト環境
        </h1>
        
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
            <UFormGroup label="画像を選択 (複数選択可)" required>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                @change="handleFileUpload"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
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
                :placeholder="imageBase64 ? 'この画像をどのように編集したいか説明してください。例：背景を青空に変更、猫を犬に変更など' : '生成したい画像の説明を入力してください。例：美しい桜の木の下で読書する猫、水彩画風'"
                :rows="3"
              />
            </UFormGroup>

            <UButton
              @click="generateImage"
              :loading="isGenerating"
              :disabled="!apiKey || !prompt || !imageBase64.length"
              color="primary"
              size="lg"
              block
            >
              {{ isGenerating ? '処理中...' : '画像を生成' }}
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
      </div>
    </div>
  </div>
</template>

<script setup>
const apiKey = ref('')
const imageBase64 = ref([])
const previewUrls = ref([])
const prompt = ref('美しい桜の木の下で読書する猫、水彩画風')
const selectedSize = ref('medium')
const selectedQuality = ref('medium')
const isGenerating = ref(false)
const result = ref(null)
const error = ref('')

const sizeOptions = [
  { label: 'Square (1024x1024) - 正方形', value: 'small' },
  { label: 'Portrait (1024x1536) - 縦長', value: 'medium' },
  { label: 'Landscape (1536x1024) - 横長', value: 'large' }
]

const qualityOptions = [
  { label: 'Low - 低品質', value: 'low' },
  { label: 'Medium - 中品質', value: 'medium' },
  { label: 'High - 高品質', value: 'high' }
]

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

const generateImage = async () => {
  if (!apiKey.value || !prompt.value || !imageBase64.value.length) {
    error.value = 'APIキー、プロンプト、および少なくとも1つの画像が必要です'
    return
  }

  isGenerating.value = true
  error.value = ''
  result.value = null

  try {
    const { data, error: apiError } = await useFetch('/api/analyze-image', {
      method: 'POST',
      body: {
        images: imageBase64.value,
        prompt: prompt.value,
        size: selectedSize.value,
        quality: selectedQuality.value,
        apiKey: apiKey.value
      }
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
</script>
