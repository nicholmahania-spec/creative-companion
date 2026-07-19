/**
 * Full product UI catalog (primary chrome) + path/wordmark.
 * Missing keys fall back to English via deep lookup.
 */

export const LOCALES = [
  { id: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { id: 'es', label: 'Spanish', native: 'Español', dir: 'ltr' },
  { id: 'fr', label: 'French', native: 'Français', dir: 'ltr' },
  { id: 'de', label: 'German', native: 'Deutsch', dir: 'ltr' },
  { id: 'pt', label: 'Portuguese', native: 'Português', dir: 'ltr' },
  { id: 'ja', label: 'Japanese', native: '日本語', dir: 'ltr' },
  { id: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
]

const EN = {
  productName: 'Creative Companion',
  tagline: 'Helper desk for ADHD creative work',
  pathAria: 'Your path through Creative Companion',
  path: {
    project: 'Project',
    work: 'Work',
    board: 'Board',
    system: 'System',
    pack: 'Pack',
  },
  pathPlain: {
    project: 'Name the work. Who is it for?',
    work: 'One step only. Complete it. Next rises.',
    board: 'Upload refs. Star up to 6 for the pack.',
    system: 'Colors, voice, type, do / don’t — live artboard.',
    pack: 'Preview and download your brand pack.',
  },
  language: 'Language',
  languageHint: 'Product name, path, and desk chrome',
  ui: {
    tools: 'Tools',
    settings: 'Settings',
    timer: 'Timer',
    calendar: 'Calendar',
    helperOn: 'Turn Helper on',
    helperOff: 'Turn Helper off',
    helperHint: 'Coach · Critique · Break',
    completeStep: 'Complete step',
    more: 'More',
    downloadVectorPdf: 'Download vector PDF',
    printSavePdf: 'Print / Save as PDF',
    previewFull: 'Preview full',
    editSystem: 'Edit system',
    work: 'Work',
    packTitle: 'Pack',
    packEyebrow: 'Brand leave-behind',
    packSub: 'print for client · or download preview',
    clientHandoff: 'Client handoff',
    packHint:
      'Print uses paper CSS (often best on screen). Download vector PDF is real text + color fills (selectable, sharp zoom). Preview-match raster is under More formats.',
    thinPack:
      'Thin pack — add a tagline, palette, or ★ Pack pins on Board before client handoff.',
    scrollPreview: 'Scroll preview for full sheet',
    leaveDesk: 'Leave desk',
    newProject: 'New project',
    logOut: 'Log out',
    logOutLock: 'Log out / lock',
    noStepYet: 'No step yet',
    queueClear: 'Queue clear',
    noPinsYet: 'No pins yet',
    openWork: 'Open Work',
    openPack: 'Open Pack',
    pathReadiness: 'Path readiness',
    appearance: 'Appearance',
    presence: 'Presence',
    workPrefs: 'Work',
    account: 'Account',
    data: 'Data',
    about: 'About',
    theme: 'Theme',
    switchDark: 'Switch to dark',
    switchLight: 'Switch to light',
    reduceMotion: 'Reduce motion',
    reduceMotionHint: 'Less animation',
    helper: 'Helper',
    signOut: 'Sign out',
    unlockDesk: 'Unlock desk',
    signIn: 'Sign in',
    createAccount: 'Create account',
    backPath: '← Path',
    backWork: '← Work',
    goToSystem: 'Go to System',
    uploadImages: 'Upload real images',
    pasteUrl: 'Paste URL',
    colorNote: 'Color / note',
    starPack: '★ Pack',
    outPack: '☆ Pack',
    moreFormats: 'More formats & backup',
    previewRaster: 'Preview PDF (raster)',
    hideWatermark: 'Hide tool watermark (client handoff)',
    currentStep: 'Current step',
    dumpIdea: 'Dump an idea',
    breakMicro: 'Break into micro-steps',
    packDest: 'Path ends at Pack — print a brand leave-behind when ready.',
    coach: 'Coach',
    critique: 'Critique',
    break: 'Break',
    processTools: 'Process & tools',
    showLess: 'Show less',
    deadlines: 'Deadlines',
    focusTimer: 'Focus timer',
  },
}

/** Deep-merge override onto English base */
function merge(base, over) {
  if (!over) return base
  const out = { ...base }
  for (const k of Object.keys(over)) {
    if (
      over[k] &&
      typeof over[k] === 'object' &&
      !Array.isArray(over[k]) &&
      base[k] &&
      typeof base[k] === 'object'
    ) {
      out[k] = merge(base[k], over[k])
    } else {
      out[k] = over[k]
    }
  }
  return out
}

const OVERRIDES = {
  es: {
    productName: 'Compañero Creativo',
    tagline: 'Escritorio compañero para trabajo creativo con TDAH',
    pathAria: 'Tu camino en Compañero Creativo',
    path: {
      project: 'Proyecto',
      work: 'Trabajo',
      board: 'Tablero',
      system: 'Sistema',
      pack: 'Pack',
    },
    pathPlain: {
      project: 'Nombra el trabajo. ¿Para quién es?',
      work: 'Un solo paso. Complétalo. Siguiente sube.',
      board: 'Sube refs. Marca hasta 6 para el pack.',
      system: 'Color, voz, tipo — artboard en vivo.',
      pack: 'Vista previa y descarga de tu pack de marca.',
    },
    language: 'Idioma',
    languageHint: 'Nombre del producto, camino y chrome del escritorio',
    ui: {
      tools: 'Herramientas',
      settings: 'Ajustes',
      timer: 'Temporizador',
      calendar: 'Calendario',
      helperOn: 'Activar Helper',
      helperOff: 'Desactivar Helper',
      completeStep: 'Completar paso',
      more: 'Más',
      downloadVectorPdf: 'Descargar PDF vectorial',
      printSavePdf: 'Imprimir / Guardar PDF',
      packTitle: 'Pack',
      packEyebrow: 'Entregable de marca',
      clientHandoff: 'Entrega al cliente',
      noStepYet: 'Aún no hay paso',
      noPinsYet: 'Aún no hay pines',
      openWork: 'Abrir Trabajo',
      openPack: 'Abrir Pack',
      pathReadiness: 'Preparación del camino',
      appearance: 'Apariencia',
      theme: 'Tema',
      switchDark: 'Cambiar a oscuro',
      switchLight: 'Cambiar a claro',
      reduceMotion: 'Reducir movimiento',
      helper: 'Helper',
      unlockDesk: 'Desbloquear escritorio',
      signIn: 'Iniciar sesión',
      currentStep: 'Paso actual',
      coach: 'Coach',
      critique: 'Crítica',
      break: 'Descanso',
      focusTimer: 'Temporizador de foco',
      deadlines: 'Plazos',
      goToSystem: 'Ir a Sistema',
      leaveDesk: 'Salir del escritorio',
      newProject: 'Nuevo proyecto',
      logOut: 'Cerrar sesión',
      logOutLock: 'Cerrar / bloquear',
    },
  },
  fr: {
    productName: 'Compagnon Créatif',
    tagline: 'Bureau compagnon pour le travail créatif TDAH',
    pathAria: 'Votre parcours dans Compagnon Créatif',
    path: {
      project: 'Projet',
      work: 'Travail',
      board: 'Planche',
      system: 'Système',
      pack: 'Pack',
    },
    language: 'Langue',
    ui: {
      tools: 'Outils',
      settings: 'Réglages',
      timer: 'Minuteur',
      calendar: 'Calendrier',
      completeStep: 'Terminer l’étape',
      downloadVectorPdf: 'Télécharger PDF vectoriel',
      printSavePdf: 'Imprimer / Enregistrer PDF',
      packTitle: 'Pack',
      openWork: 'Ouvrir Travail',
      openPack: 'Ouvrir Pack',
      pathReadiness: 'Préparation du parcours',
      appearance: 'Apparence',
      helper: 'Helper',
      currentStep: 'Étape en cours',
      coach: 'Coach',
      critique: 'Critique',
      break: 'Pause',
      noPinsYet: 'Pas encore d’épingles',
      noStepYet: 'Pas encore d’étape',
    },
  },
  de: {
    productName: 'Kreativ-Begleiter',
    tagline: 'Begleit-Schreibtisch für ADHS-kreatives Arbeiten',
    path: {
      project: 'Projekt',
      work: 'Arbeit',
      board: 'Board',
      system: 'System',
      pack: 'Pack',
    },
    language: 'Sprache',
    ui: {
      tools: 'Werkzeuge',
      settings: 'Einstellungen',
      timer: 'Timer',
      calendar: 'Kalender',
      completeStep: 'Schritt abschließen',
      downloadVectorPdf: 'Vektor-PDF laden',
      printSavePdf: 'Drucken / PDF speichern',
      openWork: 'Arbeit öffnen',
      openPack: 'Pack öffnen',
      pathReadiness: 'Pfad-Bereitschaft',
      currentStep: 'Aktueller Schritt',
      noPinsYet: 'Noch keine Pins',
      noStepYet: 'Noch kein Schritt',
      helper: 'Helper',
      coach: 'Coach',
      critique: 'Kritik',
      break: 'Pause',
    },
  },
  pt: {
    productName: 'Companheiro Criativo',
    tagline: 'Mesa companheira para trabalho criativo com TDAH',
    path: {
      project: 'Projeto',
      work: 'Trabalho',
      board: 'Board',
      system: 'Sistema',
      pack: 'Pack',
    },
    language: 'Idioma',
    ui: {
      tools: 'Ferramentas',
      settings: 'Definições',
      timer: 'Temporizador',
      calendar: 'Calendário',
      completeStep: 'Concluir passo',
      downloadVectorPdf: 'Descarregar PDF vetorial',
      printSavePdf: 'Imprimir / Guardar PDF',
      openWork: 'Abrir Trabalho',
      openPack: 'Abrir Pack',
      pathReadiness: 'Preparação do caminho',
      currentStep: 'Passo atual',
      noPinsYet: 'Ainda sem pins',
      noStepYet: 'Ainda sem passo',
      helper: 'Helper',
      coach: 'Coach',
      critique: 'Crítica',
      break: 'Pausa',
    },
  },
  ja: {
    productName: 'クリエイティブ・コンパニオン',
    tagline: 'ADHDクリエイティブのための伴走デスク',
    path: {
      project: 'プロジェクト',
      work: 'ワーク',
      board: 'ボード',
      system: 'システム',
      pack: 'パック',
    },
    language: '言語',
    ui: {
      tools: 'ツール',
      settings: '設定',
      timer: 'タイマー',
      calendar: 'カレンダー',
      completeStep: 'ステップ完了',
      downloadVectorPdf: 'ベクターPDFをダウンロード',
      printSavePdf: '印刷 / PDF保存',
      openWork: 'ワークを開く',
      openPack: 'パックを開く',
      pathReadiness: 'パス準備度',
      currentStep: '今のステップ',
      noPinsYet: 'ピンはまだありません',
      noStepYet: 'ステップはまだありません',
      helper: 'Helper',
      coach: 'コーチ',
      critique: '批評',
      break: '休憩',
    },
  },
  ar: {
    productName: 'الرفيق الإبداعي',
    tagline: 'مكتب مرافق للعمل الإبداعي مع اضطراب فرط الحركة',
    pathAria: 'مسارك في الرفيق الإبداعي',
    path: {
      project: 'مشروع',
      work: 'عمل',
      board: 'لوحة',
      system: 'نظام',
      pack: 'حزمة',
    },
    pathPlain: {
      project: 'سمِّ العمل. لمن؟',
      work: 'خطوة واحدة فقط. أنجزها. التالية ترتفع.',
      board: 'ارفع مراجع. نجّم حتى 6 للحزمة.',
      system: 'ألوان وصوت ونوع — لوح حي.',
      pack: 'معاينة وتنزيل حزمة علامتك.',
    },
    language: 'اللغة',
    languageHint: 'اسم المنتج والمسار وواجهة المكتب',
    ui: {
      tools: 'أدوات',
      settings: 'الإعدادات',
      timer: 'مؤقت',
      calendar: 'تقويم',
      helperOn: 'تشغيل المساعد',
      helperOff: 'إيقاف المساعد',
      helperHint: 'تدريب · نقد · استراحة',
      completeStep: 'إكمال الخطوة',
      more: 'المزيد',
      downloadVectorPdf: 'تنزيل PDF متجه',
      printSavePdf: 'طباعة / حفظ PDF',
      previewFull: 'معاينة كاملة',
      editSystem: 'تعديل النظام',
      work: 'عمل',
      packTitle: 'حزمة',
      packEyebrow: 'تسليم العلامة',
      packSub: 'اطبع للعميل · أو نزّل المعاينة',
      clientHandoff: 'تسليم للعميل',
      packHint:
        'الطباعة تستخدم CSS ورقي. تنزيل PDF المتجه نص حقيقي وألوان. المعاينة النقطية تحت المزيد.',
      thinPack: 'حزمة رقيقة — أضف شعارًا أو لوحة أو نجوم اللوحة قبل التسليم.',
      scrollPreview: 'مرّر المعاينة للورقة كاملة',
      leaveDesk: 'مغادرة المكتب',
      newProject: 'مشروع جديد',
      logOut: 'تسجيل الخروج',
      logOutLock: 'خروج / قفل',
      noStepYet: 'لا خطوة بعد',
      queueClear: 'الطابور فارغ',
      noPinsYet: 'لا دبابيس بعد',
      openWork: 'افتح العمل',
      openPack: 'افتح الحزمة',
      pathReadiness: 'جاهزية المسار',
      appearance: 'المظهر',
      presence: 'الحضور',
      workPrefs: 'العمل',
      account: 'الحساب',
      data: 'البيانات',
      about: 'حول',
      theme: 'السمة',
      switchDark: 'التبديل إلى الداكن',
      switchLight: 'التبديل إلى الفاتح',
      reduceMotion: 'تقليل الحركة',
      reduceMotionHint: 'حركة أقل',
      helper: 'المساعد',
      signOut: 'خروج',
      unlockDesk: 'فتح المكتب',
      signIn: 'تسجيل الدخول',
      createAccount: 'إنشاء حساب',
      backPath: '→ المسار',
      backWork: '→ العمل',
      goToSystem: 'إلى النظام',
      currentStep: 'الخطوة الحالية',
      dumpIdea: 'أفرغ فكرة',
      breakMicro: 'قسّم إلى خطوات صغيرة',
      packDest: 'ينتهي المسار عند الحزمة — اطبع تسليم العلامة عند الجاهزية.',
      coach: 'تدريب',
      critique: 'نقد',
      break: 'استراحة',
      processTools: 'عملية وأدوات',
      showLess: 'أقل',
      deadlines: 'مواعيد',
      focusTimer: 'مؤقت التركيز',
      moreFormats: 'المزيد من الصيغ والنسخ',
      previewRaster: 'PDF معاينة (نقطي)',
      hideWatermark: 'إخفاء علامة الأداة',
      uploadImages: 'رفع صور حقيقية',
      pasteUrl: 'لصق رابط',
      colorNote: 'لون / ملاحظة',
    },
  },
}

export function normalizeLocale(id) {
  const s = String(id || 'en').toLowerCase().slice(0, 2)
  if (s === 'en' || OVERRIDES[s]) return s
  return 'en'
}

export function localeDir(id) {
  const loc = LOCALES.find((L) => L.id === normalizeLocale(id))
  return loc?.dir || 'ltr'
}

export function getMessages(locale) {
  const id = normalizeLocale(locale)
  if (id === 'en') return EN
  return merge(EN, OVERRIDES[id] || {})
}

export function t(locale, key) {
  if (!key) return ''
  const msg = getMessages(locale)
  const parts = String(key).split('.')
  let cur = msg
  for (const p of parts) {
    if (cur == null) break
    cur = cur[p]
  }
  if (cur != null && cur !== '') return cur
  // English fallback
  let en = EN
  for (const p of parts) {
    if (en == null) return key
    en = en[p]
  }
  return en == null ? key : en
}

export function pathLabel(locale, stepId) {
  return t(locale, `path.${stepId}`) || stepId
}

export function pathPlain(locale, stepId) {
  return t(locale, `pathPlain.${stepId}`) || ''
}

export function isRtl(locale) {
  return localeDir(locale) === 'rtl'
}
