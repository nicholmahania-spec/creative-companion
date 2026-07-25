import { useState, useCallback } from 'react'
import { z } from 'zod'
import FormField from './FormField'

/**
 * Reusable form builder component that handles validation and submission
 * Follows existing patterns in the codebase for state management and styling
 */
export function FormBuilder({
  schema,
  initialData = {},
  mode = 'admin', // admin, client, print
  onSubmit,
  onReset,
  submitLabel = 'Submit',
  resetLabel = 'Reset',
}) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Validate form data using zod schema
  const validate = useCallback((data) => {
    try {
      schema.parse(data)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = {}
        error.errors.forEach((err) => {
          const field = err.path[0]
          if (field !== undefined) {
            fieldErrors[field] = err.message
          }
        })
        setErrors(fieldErrors)
        return false
      }
      throw error
    }
  }, [schema])

  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))

    // Clear error for this field when user interacts
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }, [errors])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()

    if (isSubmitting) return

    const isValid = validate(formData)
    if (!isValid) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setIsSubmitted(true)
      // Reset form after successful submission if in admin mode
      if (mode === 'admin' && onReset) {
        onReset()
      }
    } catch (error) {
      // Handle submission error
      console.error('Form submission error:', error)
      // Could show a toast or set a general error state
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isSubmitting, onSubmit, onReset, validate, mode])

  const handleReset = useCallback(() => {
    setFormData(initialData)
    setErrors({})
    setIsSubmitted(false)
    if (onReset) onReset()
  }, [initialData, onReset])

  // In print mode, show a clean read-only view
  if (mode === 'print') {
    return (
      <div className="form-print-view">
        <h2 className="form-title">Form Summary</h2>
        {Object.entries(formData).map(([key, value]) => (
          <div key={key} className="form-field-row">
            <span className="form-field-label">{key}:</span>
            <span className="form-field-value">
              {value === null || value === undefined ? '(Not provided)' : String(value)}
            </span>
          </div>
        ))}
        <button
          onClick={() => window.print()}
          className="btn btn-primary"
        >
          Print
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`form-builder form-mode-${mode}`}
      noValidate
    >
      <h2 className="form-title">
        {mode === 'client' ? 'Client Form' : 'Form Builder'}
      </h2>

      {/* Render form fields based on schema shape */}
      {Object.keys(schema.shape).map(fieldName => {
        const fieldDef = schema.shape[fieldName]
        const fieldValue = formData[fieldName]
        const fieldError = errors[fieldName] || ''

        // Determine field type based on zod schema
        let type = 'text'
        let options = []
        let placeholder = ''
        let required = false
        let multiline = false

        // Check if it's a required field
        if (fieldDef._def.typeName === 'string' &&
            fieldDef._def.checks?.some(c => c?.constructor.name === 'MinMaxLength')) {
          required = true
        }

        // Check for email type
        if (fieldDef._def.typeName === 'string' &&
            fieldDef._def.checks?.some(c => c.constructor.name === 'Email')) {
          type = 'email'
          placeholder = 'Enter email address'
        }

        // Check for URL type
        if (fieldDef._def.typeName === 'string' &&
            fieldDef._def.checks?.some(c => c.constructor.name === 'Url')) {
          type = 'url'
          placeholder = 'Enter URL'
        }

        // Check for password type
        if (fieldDef._def.typeName === 'string' &&
            fieldDef._def._def?.outputType === 'string' &&
            fieldDef._def._def?.checks?.some(c => c.constructor.name === 'Min')) {
          type = 'password'
          placeholder = 'Enter password'
        }

        // Check for number type
        if (fieldDef._def.typeName === 'number') {
          type = 'number'
          placeholder = 'Enter number'
        }

        // Check for date type
        if (fieldDef._def.typeName === 'date') {
          type = 'date'
        }

        // Check for boolean type (checkbox)
        if (fieldDef._def.typeName === 'boolean') {
          type = 'checkbox'
        }

        // Check for enum type (select or radio)
        if (fieldDef._def.typeName === 'union' &&
            fieldDef._def.options) {
          // This is likely an enum - we'll use select for now
          type = 'select'
          options = fieldDef._def.options.map(opt => ({
            value: opt.value,
            label: opt.value
          }))
          placeholder = 'Select an option'
        }

        // Check for array of strings (tags/multi-select)
        if (fieldDef._def.typeName === 'array' &&
            fieldDef._def.elementType._def.typeName === 'string') {
          // For simplicity, we'll treat as text input for now
          // In a more advanced version, this could be a tag input
          type = 'text'
          placeholder = 'Enter items separated by commas'
        }

        // Check if it should be a textarea (based on name or hints)
        if (['description', 'bio', 'notes', 'details', 'comments'].includes(fieldName)) {
          type = 'textarea'
          multiline = true
          rows = 4
        }

        return (
          <FormField
            key={fieldName}
            label={fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            name={fieldName}
            type={type}
            value={fieldValue}
            onChange={(value) => handleFieldChange(fieldName, value)}
            options={options}
            placeholder={placeholder}
            required={required}
            error={fieldError}
            helperText={fieldDef._def.description}
            disabled={mode === 'client' && !onSubmit} // Read-only in client mode unless submitting
          />
        )
      })}

      {/* Form actions */}
      <div className="form-actions">
        {!isSubmitted && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Submitting...' : submitLabel}
          </button>
        )}

        {mode === 'admin' && !isSubmitted && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="btn btn-outline"
          >
            {resetLabel}
          </button>
        )}

        {isSubmitted && (
          <div className="form-submission-success">
            Form submitted successfully!
            {mode === 'client' && (
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-outline"
              >
                Submit another response
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  )
}
export default FormBuilder
