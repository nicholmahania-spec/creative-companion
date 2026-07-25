import { useState, useCallback } from 'react'
import { extractPdfFormData } from '../lib/formPdfUtils'
import { flashToast } from '../App' // This will be passed as prop

/**
 * PDF upload component with drag-and-drop and file upload and form field extraction
 * Follows existing patterns from mood pin upload components
 */
export function PdfUpload({
  onFormDataExtracted, // Callback when form data is extracted from PDF
  acceptedTypes = ['application/pdf'],
  maxSizeMB = 10,
  flashToast // Toast function for feedback
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return

    await processPdfFile(files[0])
  }, [])

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files[0]
    if (!file) return

    await processPdfFile(file)
    e.target.value = '' // Reset input
  }, [])

  const processPdfFile = useCallback(async (file) => {
    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      flashToast?.(`Please upload a PDF file`)
      return
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      flashToast?.(`File too large: ${sizeMB.toFixed(1)}MB. Maximum size is ${maxSizeMB}MB`)
      return
    }

    setIsProcessing(true)
    try {
      // Extract form data from PDF
      const result = await extractPdfFormData(file)

      if (result.success && Object.keys(result.data).length > 0) {
        await onFormDataExtracted(result.data)
        flashToast?.(`Extracted ${Object.keys(result.data).length} form fields from PDF`)
      } else if (!result.success) {
        flashToast?.(`Failed to extract form data: ${result.error || 'Unknown error'}`)
      } else {
        flashToast?.(`No form fields found in PDF. You can still fill out the form manually.`)
        await onFormDataExtracted({}) // Empty data but success
      }
    } catch (error) {
      console.error('Error processing PDF:', error)
      flashToast?.(`Error processing PDF: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }, [acceptedTypes, maxSizeMB, flashToast, onFormDataExtracted])

  return (
    <div className="field-block pdf-upload">
      <label htmlFor="pdf-upload" className="field-label">
        Upload PDF Form
      </label>

      <div
        className={`pdf-drop-zone ${isDragging ? 'is-dragging' : ''} ${isProcessing ? 'is-processing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="pdf-drop-zone-content">
          {isProcessing ? (
            <div className="pdf-processing">
              <div className="pdf-spinner"></div>
              <p>Processing PDF...</p>
            </div>
          ) : (
            <>
              {isDragging ? (
                <p>Drop PDF here to extract form fields</p>
              ) : (
                <>
                  <p>Drag & drop a PDF form here, or</p>
                  <button type="button" className="btn btn-secondary">
                    Browse Files
                  </button>
                </>
              )}
              <p className="pdf-hint">
                Supported: PDF ({maxSizeMB}MB max)
              </p>
            </>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            id="pdf-upload"
            accept={acceptedTypes.map(type => type.split('/')[1]).join(',')}
            className="sr-only"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  )
}