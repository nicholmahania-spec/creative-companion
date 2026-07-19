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
    define: 'Define',
    research: 'Research',
    ideate: 'Ideate',
    sketch: 'Sketch',
    design: 'Design',
    review: 'Review',
    deliver: 'Deliver',
    // legacy aliases (fallback if old keys appear)
    project: 'Define',
    work: 'Sketch',
    board: 'Research',
    system: 'Design',
    pack: 'Deliver',
  },
  pathPlain: {
    define: 'What are we making? Who is it for? One clear goal.',
    research: 'Collect refs. Star up to 6. Stay curious, timed.',
    ideate: 'Many directions fast. No judging. Pin what sparks.',
    sketch: 'Rough drafts. 2–3 options. One step on screen.',
    design: 'Type, color, voice, layout — live artboard.',
    review: 'Show it. Ask if it feels right. Revise for the goal.',
    deliver: 'Print or vector PDF. Hand off. Note what you learned.',
    project: 'What are we making? Who is it for? One clear goal.',
    work: 'Rough drafts. 2–3 options. One step on screen.',
    board: 'Collect refs. Star up to 6. Stay curious, timed.',
    system: 'Type, color, voice, layout — live artboard.',
    pack: 'Print or vector PDF. Hand off. Note what you learned.',
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
    packSub: 'Print for paper · or download vector PDF',
    clientHandoff: 'Client handoff',
    packHint:
      'Download vector PDF = selectable text + sharp zoom. Print uses paper layout. Raster preview is under More formats.',
    thinPack:
      'Thin pack — add a tagline, palette, or ★ Pack pins on Board first.',
    thinPackConfirmPrint:
      'Pack is thin (missing tagline, palette, or pins). Print anyway?',
    thinPackConfirmDownload:
      'Pack is thin (missing tagline, palette, or pins). Download anyway?',
    scrollPreview: 'Scroll preview for full sheet',
    leaveDesk: 'Leave desk',
    newProject: 'New project',
    logOut: 'Log out',
    logOutLock: 'Log out / lock',
    noStepYet: 'No step yet',
    queueClear: 'Queue clear',
    noPinsYet: 'No pins yet',
    emptyStepBody:
      'Add one step you can finish in about 25 minutes.',
    emptyStepBodyDone:
      'Queue clear — capture the next finishable step below.',
    emptyPinsBody:
      'Upload images, then star 2–6 with ★ Pack for System and Pack.',
    openWork: 'Go to Research',
    openSketch: 'Go to Sketch',
    openPack: 'Go to Deliver',
    openReview: 'Go to Review',
    openIdeate: 'Go to Ideate',
    goToBoard: 'Go to Research',
    hasOpenWorkStep: 'Has an open Sketch step',
    howDeskWorks:
      'Seven design steps: Define → Research → Ideate → Sketch → Design → Review → Deliver.',
    projectSub: 'Define the goal. Who is it for? Then Research.',
    systemSub: 'Design — type, color, voice, logo, pins on the live artboard.',
    boardSub: 'Research — upload refs. Star up to 6 for the pack.',
    breakCareOpen:
      'Break care open — log water, food, stretch, or a real break when you take one.',
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
    backWork: '← Sketch',
    backResearch: '← Research',
    goToSystem: 'Go to Design',
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
    packDest: 'Finish at Deliver — print or download a leave-behind.',
    coach: 'Coach',
    critique: 'Critique',
    break: 'Break',
    processTools: 'Process & tools',
    showLess: 'Show less',
    deadlines: 'Deadlines',
    focusTimer: 'Focus timer',
    doThisNow: 'Do this now',
    sparkHint: 'Loose idea → pin or step',
    starPinsHint: 'Star pins on Board to curate',
    onboardTitle: 'One project. One step. Ship a pack.',
    onboardLede:
      'Name the work and one step you can finish in about 25 minutes. Leave with a brand pack PDF.',
    thinPackBanner:
      'Pack is thin — add a tagline, palette, or ★ Pack pins on Board.',
    continuePrint: 'Print anyway',
    continueDownload: 'Download anyway',
    cancel: 'Cancel',
    continue: 'Continue',
    deleteProject: 'Delete project',
    deleteProjectConfirm:
      'Delete this project and its tasks & pins? Cannot be undone.',
    forceBreaksTitle: 'Force break lockouts',
    forceBreaksHint:
      'Hard lock after Pomodoro / long sessions. Soft tips still work if off.',
    forceBreaksConsent:
      'Desk will lock 5–10 minutes after a focus block. You can turn this off anytime.',
    enable: 'Enable',
    helperQuiet: 'Helper quiet mode',
    helperQuietHint: 'No timed pings — only when you open Helper',
    timerSound: 'Timer sound',
    timerSoundHint: 'Chime when a focus session ends',
    collapseQueue: 'Collapse queue by default',
    collapseQueueHint: 'Only show the current step',
    presenceSound: 'Presence & sound',
    setDeadline: 'Set deadline',
    setDeadlineTo: 'Set project deadline to',
    lightThemeOn: 'Light (warm paper) — on',
    darkThemeOn: 'Dark (deep charcoal) — on',
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
      openPack: 'Ir al Pack',
      goToBoard: 'Ir al Tablero',
      pathReadiness: 'Preparación del camino',
      appearance: 'Apariencia',
      theme: 'Tema',
      switchDark: 'Cambiar a oscuro',
      switchLight: 'Cambiar a claro',
      reduceMotion: 'Reducir movimiento',
      reduceMotionHint: 'Menos animación',
      helper: 'Helper',
      helperQuiet: 'Helper en silencio',
      helperQuietHint: 'Sin avisos de tiempo — solo al abrir Helper',
      timerSound: 'Sonido del temporizador',
      timerSoundHint: 'Campana al terminar el foco',
      forceBreaksTitle: 'Bloqueo de descanso',
      forceBreaksHint: 'Bloqueo duro tras Pomodoro / sesiones largas.',
      forceBreaksConsent:
        'El escritorio se bloqueará 5–10 min tras un bloque de foco. Puedes apagarlo cuando quieras.',
      enable: 'Activar',
      cancel: 'Cancelar',
      continue: 'Continuar',
      thinPackBanner:
        'Pack delgado — añade eslogan, paleta o pines ★ en Tablero.',
      continuePrint: 'Imprimir igual',
      continueDownload: 'Descargar igual',
      emptyStepBody: 'Añade un paso que puedas terminar en ~25 minutos.',
      emptyStepBodyDone: 'Cola vacía — captura el siguiente paso abajo.',
      emptyPinsBody:
        'Sube imágenes y marca 2–6 con ★ Pack para Sistema y Pack.',
      howDeskWorks: 'Un paso en pantalla. Termínalo. Tablero → Sistema → Pack.',
      projectSub: 'Nombra el trabajo. Revisa preparación. Abre Trabajo o Pack.',
      systemSub: 'Artboard en vivo — eslogan, voz, color, tipo, logo, pines.',
      boardSub: 'Sube refs. Marca hasta 6 para Sistema y Pack.',
      packSub: 'Imprime en papel · o descarga PDF vectorial',
      packDest: 'Termina en Pack — imprime o descarga un entregable.',
      presenceSound: 'Presencia y sonido',
      collapseQueue: 'Colapsar cola por defecto',
      collapseQueueHint: 'Solo el paso actual',
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
      doThisNow: 'Haz esto ahora',
      lightThemeOn: 'Claro (papel) — activo',
      darkThemeOn: 'Oscuro (carbón) — activo',
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
      openPack: 'Aller au Pack',
      goToBoard: 'Aller à la Planche',
      pathReadiness: 'Préparation du parcours',
      appearance: 'Apparence',
      theme: 'Thème',
      reduceMotion: 'Réduire le mouvement',
      reduceMotionHint: 'Moins d’animation',
      helper: 'Helper',
      helperQuiet: 'Helper silencieux',
      forceBreaksTitle: 'Verrouillage pause',
      enable: 'Activer',
      cancel: 'Annuler',
      continue: 'Continuer',
      thinPackBanner:
        'Pack mince — ajoutez slogan, palette ou épingles ★ sur la Planche.',
      continuePrint: 'Imprimer quand même',
      continueDownload: 'Télécharger quand même',
      emptyStepBody: 'Ajoutez une étape faisable en ~25 minutes.',
      emptyPinsBody:
        'Importez des images, puis étoilez 2–6 avec ★ Pack.',
      packSub: 'Imprimer · ou PDF vectoriel',
      howDeskWorks: 'Une étape à l’écran. Terminez-la. Planche → Système → Pack.',
      currentStep: 'Étape en cours',
      coach: 'Coach',
      critique: 'Critique',
      break: 'Pause',
      noPinsYet: 'Pas encore d’épingles',
      noStepYet: 'Pas encore d’étape',
      presenceSound: 'Présence et son',
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
      openPack: 'Zum Pack',
      goToBoard: 'Zum Board',
      pathReadiness: 'Pfad-Bereitschaft',
      currentStep: 'Aktueller Schritt',
      noPinsYet: 'Noch keine Pins',
      noStepYet: 'Noch kein Schritt',
      helper: 'Helper',
      helperQuiet: 'Helper still',
      forceBreaksTitle: 'Pausen-Sperre',
      enable: 'Aktivieren',
      cancel: 'Abbrechen',
      continue: 'Weiter',
      thinPackBanner:
        'Dünnes Pack — Slogan, Palette oder ★-Pins auf dem Board.',
      continuePrint: 'Trotzdem drucken',
      continueDownload: 'Trotzdem laden',
      emptyStepBody: 'Ein Schritt, den du in ~25 Minuten schaffst.',
      packSub: 'Drucken · oder Vektor-PDF',
      howDeskWorks: 'Ein Schritt. Fertig. Board → System → Pack.',
      coach: 'Coach',
      critique: 'Kritik',
      break: 'Pause',
      presenceSound: 'Präsenz & Ton',
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
      openPack: 'Ir ao Pack',
      goToBoard: 'Ir ao Board',
      pathReadiness: 'Preparação do caminho',
      currentStep: 'Passo atual',
      noPinsYet: 'Ainda sem pins',
      noStepYet: 'Ainda sem passo',
      helper: 'Helper',
      helperQuiet: 'Helper silencioso',
      forceBreaksTitle: 'Bloqueio de pausa',
      enable: 'Ativar',
      cancel: 'Cancelar',
      continue: 'Continuar',
      thinPackBanner:
        'Pack fino — adicione slogan, paleta ou pins ★ no Board.',
      continuePrint: 'Imprimir mesmo assim',
      continueDownload: 'Descarregar mesmo assim',
      emptyStepBody: 'Um passo que dá para terminar em ~25 minutos.',
      packSub: 'Imprimir · ou PDF vetorial',
      howDeskWorks: 'Um passo no ecrã. Termine. Board → Sistema → Pack.',
      coach: 'Coach',
      critique: 'Crítica',
      break: 'Pausa',
      presenceSound: 'Presença e som',
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
      openPack: 'パックへ',
      goToBoard: 'ボードへ',
      pathReadiness: 'パス準備度',
      currentStep: '今のステップ',
      noPinsYet: 'ピンはまだありません',
      noStepYet: 'ステップはまだありません',
      helper: 'Helper',
      helperQuiet: 'Helper静音',
      forceBreaksTitle: '休憩ロック',
      enable: '有効',
      cancel: 'キャンセル',
      continue: '続行',
      thinPackBanner:
        '薄いパック — タグライン・パレット・★ピンをボードで。',
      continuePrint: '印刷する',
      continueDownload: 'ダウンロードする',
      emptyStepBody: '約25分で終わる一歩を追加。',
      packSub: '印刷 · またはベクターPDF',
      howDeskWorks: '画面に一歩。終えて Board → System → Pack。',
      coach: 'コーチ',
      critique: '批評',
      break: '休憩',
      presenceSound: '存在と音',
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
      openPack: 'إلى الحزمة',
      goToBoard: 'إلى اللوحة',
      pathReadiness: 'جاهزية المسار',
      appearance: 'المظهر',
      presence: 'الحضور',
      presenceSound: 'الحضور والصوت',
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
      helperQuiet: 'مساعد هادئ',
      helperQuietHint: 'بدون تنبيهات زمنية — فقط عند فتح المساعد',
      timerSound: 'صوت المؤقت',
      timerSoundHint: 'جرس عند انتهاء التركيز',
      forceBreaksTitle: 'قفل الاستراحة',
      forceBreaksHint: 'قفل صلب بعد بومودورو / جلسات طويلة.',
      forceBreaksConsent:
        'سيُقفل المكتب ٥–١٠ دقائق بعد كتلة تركيز. يمكنك إيقافه في أي وقت.',
      enable: 'تفعيل',
      cancel: 'إلغاء',
      continue: 'متابعة',
      thinPackBanner:
        'حزمة رقيقة — أضف شعارًا أو لوحة أو نجومًا على اللوحة.',
      continuePrint: 'اطبع على أي حال',
      continueDownload: 'نزّل على أي حال',
      emptyStepBody: 'أضف خطوة يمكن إنهاؤها في نحو ٢٥ دقيقة.',
      emptyStepBodyDone: 'الطابور فارغ — التقط الخطوة التالية.',
      emptyPinsBody: 'ارفع صورًا ثم نجّم ٢–٦ بـ ★ للحزمة.',
      howDeskWorks: 'خطوة واحدة على الشاشة. أنجزها. لوحة → نظام → حزمة.',
      projectSub: 'سمِّ العمل. راجع الجاهزية. افتح العمل أو الحزمة.',
      systemSub: 'لوح حي — شعار وصوت ولون ونوع وشعار ونجوم.',
      boardSub: 'ارفع مراجع. نجّم حتى ٦ للنظام والحزمة.',
      packSub: 'اطبع للورق · أو نزّل PDF متجه',
      packDest: 'انتهِ عند الحزمة — اطبع أو نزّل تسليمًا.',
      collapseQueue: 'طي الطابور افتراضيًا',
      collapseQueueHint: 'اعرض الخطوة الحالية فقط',
      doThisNow: 'افعل هذا الآن',
      lightThemeOn: 'فاتح (ورق) — مفعّل',
      darkThemeOn: 'داكن (فحم) — مفعّل',
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
