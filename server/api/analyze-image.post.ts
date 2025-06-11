import { OpenAI } from 'openai'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  const { imageBase64, prompt, size, quality, apiKey } = body
  
  if (!prompt || !apiKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: prompt and apiKey'
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
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey
    })

    let response

    if(!imageBase64) {

      response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        size: selectedSize as "1024x1024" | "1024x1536" | "1536x1024",
        quality: quality || "medium",
        n: 1
      })
    } else {
      // Convert base64 to File for image editing
      const imageBuffer = Buffer.from(imageBase64, 'base64')
      const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' })
      
      response = await openai.images.edit({
        model: "gpt-image-1", 
        image: imageFile,
        prompt,
        size: selectedSize as "1024x1024" | "1024x1536" | "1536x1024",
        quality: quality || "medium",
        n: 1
      })
    }

    // Get base64 encoded image data
    const imageData = response.data[0].b64_json
    const imageDataUrl = `data:image/png;base64,${imageData}`
    
    return {
      success: true,
      imageUrl: null,
      imageData: imageDataUrl,
      selectedSize,
      originalPrompt: prompt,
      rawResponse: null
    }
  } catch (error) {
    console.error('Error calling GPT-Image-1 API:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})