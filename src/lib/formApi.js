import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Submit form data to Supabase
 * @param {Object} formData - The form data to submit
 * @param {string} formName - Name/identifier of the form
 * @param {string} projectId - Associated project ID
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function submitForm(formData, formName = 'unnamed_form', projectId = null) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not signed in' }
    }

    // Prepare the record to insert
    const record = {
      owner_id: user.id,
      form_name: formName,
      form_data: formData,
      submitted_at: new Date().toISOString(),
      project_id: projectId,
    }

    // Insert into forms table
    const { data, error } = await supabase
      .from('forms')
      .insert(record)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error submitting form:', error)
    return { success: false, error: error.message || 'Failed to submit form' }
  }
}

/**
 * Get a form by ID
 * @param {string} formId - The form ID
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function getForm(formId) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching form:', error)
    return { success: false, error: error.message || 'Failed to fetch form' }
  }
}

/**
 * Get forms for a project
 * @param {string} projectId - The project ID
 * @returns {Promise<{ success: boolean, data?: any[], error?: string }>}
 */
export async function getUserForms(projectId = null) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    let query = supabase.from('forms').select('*').order('submitted_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching forms:', error)
    return { success: false, error: error.message || 'Failed to fetch forms' }
  }
}

/**
 * Update form data
 * @param {string} formId - The form ID
 * @param {Object} formData - Updated form data
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function updateForm(formId, formData) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    const { data, error } = await supabase
      .from('forms')
      .update({
        form_data: formData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', formId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating form:', error)
    return { success: false, error: error.message || 'Failed to update form' }
  }
}

/**
 * Delete a form
 * @param {string} formId - The form ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteForm(formId) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    const { error } = await supabase
      .from('forms')
      .delete()
      .eq('id', formId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting form:', error)
    return { success: false, error: error.message || 'Failed to delete form' }
  }
}