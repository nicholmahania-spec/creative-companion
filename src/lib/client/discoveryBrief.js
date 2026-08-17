/**
 * Discovery Brief — merged brand identity/strategy project brief +
 * client questionnaire, used for pre-Define client discovery calls.
 * Single field schema drives: the self-fill form, the one-at-a-time
 * call-script mode, and the fillable markdown export.
 */

export const DISCOVERY_SECTIONS = [
  {
    id: 'overview',
    label: 'Project Overview & Administration',
    fields: [
      { id: 'projectTitle', label: 'Project title', type: 'text' },
      { id: 'clientName', label: 'Client / company name', type: 'text' },
      { id: 'primaryContact', label: 'Primary contact & role', type: 'text' },
      { id: 'startDeadline', label: 'Project start date & deadline', type: 'text' },
      { id: 'budgetRange', label: 'Budget range', type: 'text' },
    ],
  },
  {
    id: 'background',
    label: 'Company Background & Strategy',
    fields: [
      {
        id: 'story',
        label: 'The story',
        prompt: 'How did the business start, and why?',
        type: 'textarea',
      },
      {
        id: 'offering',
        label: 'What you offer',
        prompt: 'In 2–3 sentences, what product or service do you offer?',
        type: 'textarea',
      },
      {
        id: 'problem',
        label: 'The problem',
        prompt: 'Why did you start this business (or what sparked this rebrand)? What commercial challenge or market gap is this identity solving? What is the #1 problem you solve for customers?',
        type: 'textarea',
      },
      {
        id: 'coreValues',
        label: 'Core values',
        prompt: 'List 3–5 words that define what the brand stands for.',
        type: 'text',
      },
      {
        id: 'usp',
        label: 'What makes you different?',
        prompt: 'Why would someone pick you over someone else doing the same thing?',
        type: 'textarea',
      },
      {
        id: 'fiveYearVision',
        label: 'Where do you see your brand in 5 years?',
        type: 'textarea',
      },
    ],
  },
  {
    id: 'audience',
    label: 'Target Audience & Market',
    fields: [
      {
        id: 'targetAudience',
        label: 'Target audience',
        prompt: 'Describe your ideal customer: age, location, profession, lifestyle, income, interests.',
        type: 'textarea',
      },
      {
        id: 'audiencePains',
        label: 'What frustrates your customers most?',
        type: 'textarea',
      },
      {
        id: 'desiredFeeling',
        label: 'How should a customer feel interacting with this brand?',
        type: 'textarea',
      },
      {
        id: 'competitors',
        label: 'Who else does what you do?',
        prompt: 'Two or three names, and what you like or don’t like about how they look.',
        type: 'textarea',
      },
    ],
  },
  {
    id: 'personality',
    label: 'Brand Voice & Creative Direction',
    fields: [
      {
        id: 'brandAsPerson',
        label: 'If your brand was a person, how would you describe their personality?',
        type: 'textarea',
      },
      { id: 'spectrumModernTraditional', label: 'Modern vs. Traditional', type: 'text' },
      { id: 'spectrumPlayfulProfessional', label: 'Playful vs. Professional', type: 'text' },
      { id: 'spectrumHighEndAffordable', label: 'High-end vs. Affordable', type: 'text' },
      { id: 'spectrumBoldMinimalist', label: 'Bold vs. Minimalist', type: 'text' },
      { id: 'toneOfVoice', label: 'Tone of voice', prompt: 'Playful, serious, formal, casual?', type: 'text' },
      { id: 'visualStyleKeywords', label: 'Visual style keywords', prompt: 'e.g. minimalist, bold, vintage, modern', type: 'text' },
      { id: 'inspirationLinks', label: 'Inspiration / mood board links', type: 'textarea' },
      { id: 'admiredBrands', label: 'Brands you admire and why', type: 'textarea' },
      {
        id: 'elementsToAvoid',
        label: 'Words, colors, styles, or clichés to avoid',
        type: 'textarea',
      },
    ],
  },
  {
    id: 'scope',
    label: 'Deliverables & Technical Scope',
    fields: [
      {
        id: 'mustHaveDeliverables',
        label: 'Must-have deliverables',
        prompt: 'e.g. logo, business cards, social templates, packaging, guidelines PDF',
        type: 'textarea',
      },
      {
        id: 'existingAssets',
        label: 'Existing assets to keep',
        prompt: 'Current logo, specific colors, photography we must keep?',
        type: 'textarea',
      },
      {
        id: 'fileFormats',
        label: 'File formats you need',
        prompt: 'Only if you already know — otherwise leave this blank.',
        type: 'text',
      },
      { id: 'launchDate', label: 'Ideal launch date', type: 'text' },
      { id: 'decisionMakers', label: 'Key decision-makers approving concepts', type: 'text' },
    ],
  },
]

export const DISCOVERY_FIELDS = DISCOVERY_SECTIONS.flatMap((s) => s.fields)

export function blankDiscoveryBrief() {
  return {}
}

/** Renders the whole brief as a fillable markdown document — blank
 * lines for unanswered fields, filled in for answered ones. */
export function discoveryBriefToMarkdown(answers = {}, meta = {}) {
  const lines = [
    `# Brand Discovery Brief${meta.clientName ? ` — ${meta.clientName}` : ''}`,
    '',
    '_Fill in each field below. Leave blank if not sure yet._',
    '',
  ]
  DISCOVERY_SECTIONS.forEach((section, i) => {
    lines.push(`## ${i + 1}. ${section.label}`, '')
    section.fields.forEach((f) => {
      lines.push(`**${f.label}**${f.prompt ? `  \n_${f.prompt}_` : ''}`)
      const val = String(answers[f.id] || '').trim()
      lines.push(val ? val : '_(not answered yet)_', '')
    })
  })
  return lines.join('\n')
}

/** Plain-text version for email bodies (mailto has no markdown rendering). */
export function discoveryBriefToPlainText(answers = {}, meta = {}) {
  const lines = [`Brand Discovery Brief${meta.clientName ? ` — ${meta.clientName}` : ''}`, '']
  DISCOVERY_SECTIONS.forEach((section, i) => {
    lines.push(`${i + 1}. ${section.label}`)
    section.fields.forEach((f) => {
      const val = String(answers[f.id] || '').trim()
      lines.push(`- ${f.label}: ${val || '(not answered yet)'}`)
    })
    lines.push('')
  })
  return lines.join('\n')
}

export function countAnswered(answers = {}) {
  return DISCOVERY_FIELDS.filter((f) => String(answers[f.id] || '').trim()).length
}

/** True when the historical notes surface has something to show. */
export function hasHistoricalDiscoveryNotes(project) {
  return (
    countAnswered(project?.discoveryAnswers) > 0 || !!project?.discoveryUpload
  )
}
