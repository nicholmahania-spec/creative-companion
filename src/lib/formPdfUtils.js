import { PDFLib } from 'pdf-lib'

/**
 * PDF form parsing utilities
 * Extracts data from PDF forms for auto-filling
 */

/**
 * Extract form field data from a PDF file
 * @param {File|ArrayBuffer} pdfFile - The PDF file to parse
 * @returns {Promise<{ success: boolean, data: object, error?: string }>}
 */
export async function extractPdfFormData(pdfFile) {
  try {
    // Convert File to ArrayBuffer if needed
    const pdfBytes = pdfFile instanceof File
      ? await pdfFile.arrayBuffer()
      : pdfFile

    // Load the PDF document
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes)

    // Get form fields
    const form = pdfDoc.getForm()
    const fields = form.getFields()

    // Extract data from each field
    const formData = {}

    for (const field of fields) {
      const fieldName = field.getName()
      let fieldValue = null

      // Handle different field types
      if (field.constructor.name === 'PDFTextField') {
        fieldValue = field.getText()
      } else if (field.constructor.name === 'PDFCheckbox') {
        fieldValue = field.isChecked()
      } else if (field.constructor.name === 'PDFRadioButtonGroup') {
        fieldValue = field.getSelectedOption()
      } else if (field.constructor.name === 'PDFOptionList' ||
                 field.constructor.name === 'PDFComboBox') {
        fieldValue = field.getSelected()
      }
      // Add other field types as needed

      if (fieldValue !== null && fieldValue !== undefined) {
        formData[fieldName] = fieldValue
      }
    }

    return {
      success: true,
      data: formData
    }
  } catch (error) {
    console.error('Error extracting PDF form data:', error)
    return {
      success: false,
      data: {},
      error: error.message || 'Failed to extract PDF form data'
    }
  }
}

/**
 * Create a fillable PDF form from form data and schema
 * @param {object} formData - The data to pre-fill in the form
 * @param {object} schema - The form schema defining field types
 * @param {string} title - Title for the PDF
 * @returns {Promise<PDFLib.PDFDocument>} The PDF document
 */
export async function createFillablePdfForm(formData, schema = {}, title = 'Form') {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFLib.PDFDocument.create()
    const page = pdfDoc.addPage([600, 800]) // Letter size-ish

    const { PDFTextField, PDFCheckbox, PDFRadioButton, PDFOptionList } = PDFLib

    const form = pdfDoc.getForm()

    // Form styling
    const fontSize = 12
    const lineHeight = 20
    const startX = 50
    let startY = 750
    const fieldWidth = 400
    const fieldHeight = 25

    // Add title
    page.drawText(title, {
      x: startX,
      y: startY,
      size: 20,
      font: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold),
      color: PDFLib.rgb(0.11, 0.07, 0.09) // Dark gray from your palette
    })

    startY -= 40

    // Process schema to create form fields
    const formFields = Object.keys(schema.shape || {})
    const fieldsToShow = formFields.length > 0 ? formFields : Object.keys(formData)

    for (const fieldName of fieldsToShow) {
      const value = formData[fieldName]
      const label = schema.shape[fieldName]?._def?.description ||
                    fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())

      // Check if we need a new column or page
      if (startY < 100) {
        // Add new page
        const newPage = pdfDoc.addPage([600, 800])
        form.copyPage(newPage, pdfDoc.getPageCount() - 1) // Copy form to new page
        startY = 750
      }

      // Draw label
      page.drawText(`${label}:`, {
        x: startX,
        y: startY,
        size: fontSize,
        font: await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica),
        color: PDFLib.rgb(0.04, 0.07, 0.13) // Dark blue-gray
      })

      const fieldX = startX + 150
      const fieldY = startY - 20

      let field
      // Determine field type based on schema
      const fieldDef = schema.shape[fieldName]

      if (fieldDef && fieldDef._def.typeName === 'string') {
        // Check if it's email, url, etc.
        const checks = fieldDef._def.checks || []
        if (checks.some(c => c.constructor.name === 'Email')) {
          // Email field - still a text field
          field = form.createTextField(fieldName)
        } else if (checks.some(c => c.constructor.name === 'Url')) {
          // URL field - still a text field
          field = form.createTextField(fieldName)
        } else {
          // Regular text field
          field = form.createTextField(fieldName)
        }
        field.setText(value || '')
        field.addToPage(page, { x: fieldX, y: fieldY, width: fieldWidth, height: fieldHeight })
      } else if (fieldDef && fieldDef._def.typeName === 'boolean') {
        // Checkbox field
        field = form.createCheckbox(fieldName)
        field.check()
        field.addToPage(page, { x: fieldX, y: fieldY + 5, size: 15 })
      } else if (fieldDef && fieldDef._def.typeName === 'number') {
        // Number field - still a text field
        field = form.createTextField(fieldName)
        field.setText(value?.toString() || '')
        field.addToPage(page, { x: fieldX, y: fieldY, width: fieldWidth, height: fieldHeight })
      } else if (fieldDef && fieldDef._def.typeName === 'date') {
        // Date field - still a text field
        field = form.createTextField(fieldName)
        field.setText(value || '')
        field.addToPage(page, { x: fieldX, y: fieldY, width: fieldWidth, height: fieldHeight })
      } else {
        // Default to text field for unknown types
        field = form.createTextField(fieldName)
        field.setText(value?.toString() || '')
        field.addToPage(page, { x: fieldX, y: fieldY, width: fieldWidth, height: fieldHeight })
      }

      startY -= lineHeight
    }

    return pdfDoc
  } catch (error) {
    console.error('Error creating fillable PDF form:', error)
    throw error
  }
}

/**
 * Download a fillable PDF form
 * @param {object} formData - The data to pre-fill in the form
 * @param {object} schema - The form schema defining field types
 * @param {string} title - Title for the PDF
 * @param {Promise|null} handlePromise - From captureSaveHandle()
 * @returns {Promise<{ ok: boolean, blob: Blob, error?: string }>}
 */
export async function downloadFillablePdfForm(
  formData,
  schema = {},
  title = 'Form',
  handlePromise = null
) {
  try {
    const pdfDoc = await createFillablePdfForm(formData, schema, title)
    const pdfBytes = await pdfDoc.save()

    const blob = new Blob([pdfBytes], { type: 'application/pdf' })

    if (handlePromise) {
      const written = await writeToSaveHandle(handlePromise, blob)
      if (written.ok) {
        return { ok: true, blob, ...written }
      }
      return { ok: false, error: written.error || 'Failed to save PDF' }
    }

    // Generate filename
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'form'

    const filename = `${safeTitle}-fillable.pdf`

    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    return { ok: true, blob }
  } catch (error) {
    console.error('Error downloading fillable PDF form:', error)
    return { ok: false, error: error.message || 'Failed to download fillable PDF form' }
  }
}