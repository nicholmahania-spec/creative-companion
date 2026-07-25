import { useState } from 'react'
import { z } from 'zod'

/**
 * Reusable form field component that handles different input types
 * Follows the existing styling patterns in the codebase
 */
export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  options = [],
  placeholder = '',
  required = false,
  error = '',
  helperText = '',
  disabled = false,
  multiline = false,
  rows = 4
}) {
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (e) => {
    onChange(e.target.value)
  }

  const handleFileChange = (e) => {
    onChange(e.target.files[0] || null)
  }

  const handleSelectChange = (e) => {
    onChange(e.target.value)
  }

  const handleCheckboxChange = (e) => {
    onChange(e.target.checked)
  }

  const handleRadioChange = (e) => {
    onChange(e.target.value)
  }

  const handleDateChange = (e) => {
    onChange(e.target.value)
  }

  // Determine input type based on props
  const isTextType = ['text', 'email', 'password', 'number', 'url', 'tel'].includes(type)
  const isSelectType = type === 'select'
  const isCheckboxType = type === 'checkbox'
  const isRadioType = type === 'radio'
  const isDateType = type === 'date'
  const isFileType = type === 'file'

  return (
    <div className="field-block">
      <label
        htmlFor={name}
        className={`field-label ${isFocused ? 'field-label-focused' : ''}`}
      >
        {label}
        {required && <span className="field-required">*</span>}
      </label>

      {isTextType && !multiline && (
        <input
          id={name}
          type={type}
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`field-input ${error ? 'field-input-error' : ''}`}
        />
      )}

      {isTextType && multiline && (
        <textarea
          id={name}
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`field-input ${error ? 'field-input-error' : ''}`}
        />
      )}

      {isSelectType && (
        <select
          id={name}
          value={value || ''}
          onChange={handleSelectChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`field-input ${error ? 'field-input-error' : ''}`}
        >
          <option value="">-- Select an option --</option>
          {options.map(option => (
            <option key={option.value || option} value={option.value || option}>
              {option.label || option}
            >
          ))}
        </select>
      )}

      {isCheckboxType && (
        <div className="field-checkbox">
          <input
            id={name}
            type="checkbox"
            checked={!!value}
            onChange={handleCheckboxChange}
            required={required}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`field-checkbox-input ${error ? 'field-checkbox-input-error' : ''}`}
          />
          <label htmlFor={name} className="field-checkbox-label">
            {label}
          </label>
        </div>
      )}

      {isRadioType && (
        <fieldset className="field-radio-group">
          <legend className="field-label">{label}</legend>
          {options.map(option => (
            <div key={option.value || option} className="field-radio-option">
              <input
                id={`${name}-${option.value || option}`}
                type="radio"
                name={name}
                value={option.value || option}
                checked={value === (option.value || option)}
                onChange={handleRadioChange}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`field-radio-input ${error ? 'field-radio-input-error' : ''}`}
              />
              <label htmlFor={`${name}-${option.value || option}`} className="field-radio-label">
                {option.label || option}
              </label>
            </div>
          ))}
        </fieldset>
      )}

      {isDateType && (
        <input
          id={name}
          type="date"
          value={value || ''}
          onChange={handleDateChange}
          required={required}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`field-input ${error ? 'field-input-error' : ''}`}
        />
      )}

      {isFileType && (
        <div className="field-file-upload">
          <input
            id={name}
            type="file"
            onChange={handleFileChange}
            required={required}
            disabled={disabled}
            className="field-file-input"
          />
          <label htmlFor={name} className="field-file-label">
            {placeholder || 'Choose a file'}
          </label>
        </div>
      )}

      {error && (
        <p className="field-error">{error}</p>
      )}

      {helperText && !error && (
        <p className="field-helper-text">{helperText}</p>
      )}
    </div>
  )
}