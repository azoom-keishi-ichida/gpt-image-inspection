import { OpenAI, toFile } from 'openai'

export default defineEventHandler(async (event) => {
  try {
    console.log('Inpaint API request received at:', new Date().toISOString())
    const body = await readBody(event)
    
    console.log('Request body keys:', Object.keys(body))
    console.log('Request body size:', JSON.stringify(body).length)
    
    // Base64データの詳細をログ出力
    console.log('Base64 data info:', {
      imagePrefix: body.image?.substring(0, 50),
      maskPrefix: body.mask?.substring(0, 50),
      imageLength: body.image?.length,
      maskLength: body.mask?.length
    })
    
    const { image, mask, prompt, size = "1024x1024", quality = "standard", apiKey } = body

    if (!image || !mask || !prompt || !apiKey) {
      console.error('Missing parameters:', { 
        hasImage: !!image, 
        hasMask: !!mask, 
        hasPrompt: !!prompt, 
        hasApiKey: !!apiKey 
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters: image, mask, prompt, apiKey'
      })
    }

    const client = new OpenAI({
      apiKey: apiKey,
    })

    // Base64からImageFileを作成
    // data:image/png;base64,プレフィックスを削除
    const cleanImage = image.replace(/^data:image\/[a-z]+;base64,/, '')
    const imageBuffer = Buffer.from(cleanImage, 'base64')
    const imageFile = await toFile(imageBuffer, "image.png", {
      type: "image/png",
    })

    // Base64からマスクファイルを作成
    // data:image/png;base64,プレフィックスを削除
    const cleanMask = mask.replace(/^data:image\/[a-z]+;base64,/, '')
    const maskBuffer = Buffer.from(cleanMask, 'base64')
    
    console.log('Mask processing:', {
      originalLength: mask.length,
      cleanLength: cleanMask.length,
      hasDataPrefix: mask.startsWith('data:'),
      bufferSize: maskBuffer.length
    })
    
    const maskFile = await toFile(maskBuffer, "mask.png", {
      type: "image/png",
    })

    console.log('Inpainting API called with:', {
      imageSize: imageFile.size,
      maskSize: maskFile.size,
      prompt: prompt,
      size: size,
      quality: quality
    })

    const response = await client.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      mask: maskFile,
      prompt: prompt,
      size: size,
      quality: quality,
      n: 1
    })

    console.log('Inpainting completed successfully')

    return {
      success: true,
      data: response.data,
      imageUrl: response.data?.[0]?.url
    }
  } catch (error: any) {
    console.error('Inpaint API error:', error)
    throw createError({
      statusCode: error.status || 500,
      statusMessage: `API error: ${error.message}`
    })
  }
})