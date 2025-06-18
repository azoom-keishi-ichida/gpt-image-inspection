import { OpenAI, toFile } from 'openai'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  const { images, prompt, size, quality, apiKey } = body
  
  if (!prompt || !apiKey || !images?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: '必須項目が不足しています: プロンプト、APIキー、および少なくとも1つの画像が必要です'
    })
  }

  const sizeMap = {
    'small': '1024x1024',
    'medium': '1024x1536', 
    'large': '1536x1024'
  }

  const selectedSize = sizeMap[size] || sizeMap['medium']

  console.log('apiKey:', apiKey)

  try {
    const openai = new OpenAI({
      apiKey: apiKey
    })

    // 複数の画像をFileオブジェクトに変換
    const imageFiles = await Promise.all(
      images.map(async (imgBase64: string, index: number) => {
        const buffer = Buffer.from(imgBase64, 'base64')
        return await toFile(buffer, `image-${index}.png`, { type: 'image/png' })
      })
    )

    // 複数画像を1つのリクエストで送信
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFiles,
      prompt,
      size: selectedSize as "1024x1024" | "1024x1536" | "1536x1024",
      quality: quality || "medium",
      n: 1
    })

    return {
      success: true,
      imageUrl: null,
      imageData: `data:image/png;base64,${response.data[0].b64_json}`,
      selectedSize,
      originalPrompt: prompt
    }
  } catch (error) {
    console.error('Error calling GPT-Image-1 API:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})