export const convertPdfToText = async (file: File): Promise<string> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
  
      const response = await fetch('/api/convert-pdf', {
        method: 'POST',
        body: formData
      })
  
      if (!response.ok) {
        throw new Error('Conversion failed')
      }
  
      const { text } = await response.json()
      return text
    } catch (error) {
      console.error('PDF conversion error:', error)
      throw new Error('Failed to convert PDF to text')
    }
  }