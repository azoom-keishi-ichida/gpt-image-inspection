import { OpenAI, toFile } from 'openai'

export default defineEventHandler(async (event) => {
  try {
    console.log('API request received at:', new Date().toISOString())
    const body = await readBody(event)
    
    console.log('Request body keys:', Object.keys(body))
    console.log('Request body size:', JSON.stringify(body).length)
    
    const { images, prompt, size, quality, apiKey, mask } = body
    
    if (!prompt || !apiKey) {
      throw createError({
        statusCode: 400,
        statusMessage: '必須項目が不足しています: プロンプトとAPIキーが必要です'
      })
    }

    // モードを判定
    const hasImages = images && images.length > 0
    const hasMask = mask && mask.length > 0
    
    let mode = 'generate' // デフォルトは生成
    if (hasImages && hasMask) {
      mode = 'inpaint' // 部分修正
    } else if (hasImages) {
      mode = 'edit' // 画像編集
    }

    const sizeMap = {
      'small': '1024x1024',
      'medium': mode === 'generate' ? '1024x1792' : '1024x1536', 
      'large': mode === 'generate' ? '1792x1024' : '1536x1024'
    }

    const selectedSize = sizeMap[size] || sizeMap['medium']

    console.log('Mode:', mode)
    console.log('Selected size:', selectedSize)
    console.log('API Key provided:', !!apiKey)

    const client = new OpenAI({
      apiKey: apiKey
    })

    let response

    if (mode === 'generate') {
      response = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        size: 'auto',
        quality: quality || "medium",
        n: 1
      })
    } else if (mode === 'inpaint') {
      // 部分修正モード - GPT-Image-1 with mask
      console.log('Inpainting with GPT-Image-1 and mask')
      
      if (!images || !images[0]) {
        throw createError({
          statusCode: 400,
          statusMessage: '画像が必要です'
        })
      }
      
      if (!mask) {
        throw createError({
          statusCode: 400,
          statusMessage: 'マスクが必要です'
        })
      }

      // Base64から画像ファイルを作成
      const imageBuffer = Buffer.from(images[0], 'base64')
      const imageFile = await toFile(imageBuffer, "image.png", {
        type: "image/png",
      })

      // Base64からマスクファイルを作成
      const maskBuffer = Buffer.from(mask, 'base64')
      const maskFile = await toFile(maskBuffer, "mask.png", {
        type: "image/png",
      })

      console.log('Files created:', {
        imageSize: imageFile.size,
        maskSize: maskFile.size,
        imageType: imageFile.type,
        maskType: maskFile.type
      })

      response = await client.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        mask: maskFile,
        prompt: prompt,
        size: selectedSize as "1024x1024" | "1024x1536" | "1536x1024",
        quality: quality || "high",
        n: 1
      })

      console.log('Inpainting completed successfully')
      
    } else {
      // 画像編集モード - GPT-Image-1 without mask
      console.log('Editing image with GPT-Image-1')
      
      if (!images || !images[0]) {
        throw createError({
          statusCode: 400,
          statusMessage: '画像が必要です'
        })
      }

      const imageBuffer = Buffer.from(images[0], 'base64')
      const imageFile = await toFile(imageBuffer, "image.png", {
        type: "image/png",
      })

      console.log('Image file created:', {
        size: imageFile.size,
        type: imageFile.type
      })

      response = await client.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
        size: selectedSize as "1024x1024" | "1024x1536" | "1536x1024",
        quality: quality || "medium",
        n: 1
      })

      console.log('Image editing completed successfully')
    }

    // レスポンス処理
    let imageData = null
    if (response.data[0].b64_json) {
      imageData = `data:image/png;base64,${response.data[0].b64_json}`
    } else if (response.data[0].url) {
      imageData = response.data[0].url
    }

    console.log('Response format:', {
      hasB64Json: !!response.data[0].b64_json,
      hasUrl: !!response.data[0].url,
      mode: mode
    })

    return {
      success: true,
      imageUrl: response.data[0].url || null,
      imageData: imageData,
      selectedSize,
      originalPrompt: prompt,
      mode
    }

  } catch (error) {
    console.error('API Error:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      type: error.type
    })
    
    throw createError({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})