/**
 * Product localization — wordmark, tagline, path labels.
 * Not a full UI catalog; signature + path chrome only.
 */

export const LOCALES = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'es', label: 'Spanish', native: 'Español' },
  { id: 'fr', label: 'French', native: 'Français' },
  { id: 'de', label: 'German', native: 'Deutsch' },
  { id: 'pt', label: 'Portuguese', native: 'Português' },
  { id: 'ja', label: 'Japanese', native: '日本語' },
]

const M = {
  en: {
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
    languageHint: 'Product name and path labels',
  },
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
    languageHint: 'Nombre del producto y pasos del camino',
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
    pathPlain: {
      project: 'Nommez le travail. Pour qui ?',
      work: 'Une seule étape. Terminez-la. La suivante monte.',
      board: 'Ajoutez des refs. Étoilez jusqu’à 6 pour le pack.',
      system: 'Couleurs, voix, typo — artboard vivant.',
      pack: 'Aperçu et téléchargement de votre pack de marque.',
    },
    language: 'Langue',
    languageHint: 'Nom du produit et libellés du parcours',
  },
  de: {
    productName: 'Kreativ-Begleiter',
    tagline: 'Begleit-Schreibtisch für ADHS-kreatives Arbeiten',
    pathAria: 'Dein Weg durch Kreativ-Begleiter',
    path: {
      project: 'Projekt',
      work: 'Arbeit',
      board: 'Board',
      system: 'System',
      pack: 'Pack',
    },
    pathPlain: {
      project: 'Benenne die Arbeit. Für wen?',
      work: 'Nur ein Schritt. Erledigen. Nächster steigt auf.',
      board: 'Refs hochladen. Bis 6 fürs Pack markieren.',
      system: 'Farbe, Stimme, Schrift — Live-Artboard.',
      pack: 'Vorschau und Download deines Brand-Packs.',
    },
    language: 'Sprache',
    languageHint: 'Produktname und Pfad-Labels',
  },
  pt: {
    productName: 'Companheiro Criativo',
    tagline: 'Mesa companheira para trabalho criativo com TDAH',
    pathAria: 'Seu caminho no Companheiro Criativo',
    path: {
      project: 'Projeto',
      work: 'Trabalho',
      board: 'Board',
      system: 'Sistema',
      pack: 'Pack',
    },
    pathPlain: {
      project: 'Nomeie o trabalho. Para quem é?',
      work: 'Um passo só. Conclua. O próximo sobe.',
      board: 'Envie refs. Estrele até 6 para o pack.',
      system: 'Cor, voz, tipo — artboard ao vivo.',
      pack: 'Prévia e download do seu pack de marca.',
    },
    language: 'Idioma',
    languageHint: 'Nome do produto e rótulos do caminho',
  },
  ja: {
    productName: 'クリエイティブ・コンパニオン',
    tagline: 'ADHDクリエイティブのための伴走デスク',
    pathAria: 'クリエイティブ・コンパニオンのパス',
    path: {
      project: 'プロジェクト',
      work: 'ワーク',
      board: 'ボード',
      system: 'システム',
      pack: 'パック',
    },
    pathPlain: {
      project: '仕事に名前を。誰のため？',
      work: '一歩だけ。完了。次が上がる。',
      board: 'リファレンスを上げ、パック用に最大6つ星。',
      system: '色・声・書体 — ライブアートボード。',
      pack: 'ブランドパックのプレビューとダウンロード。',
    },
    language: '言語',
    languageHint: '製品名とパスのラベル',
  },
}

export function normalizeLocale(id) {
  const s = String(id || 'en').toLowerCase().slice(0, 2)
  return M[s] ? s : 'en'
}

export function getMessages(locale) {
  return M[normalizeLocale(locale)] || M.en
}

/** Dot-path key, e.g. path.work or productName */
export function t(locale, key) {
  const msg = getMessages(locale)
  if (!key) return ''
  const parts = String(key).split('.')
  let cur = msg
  for (const p of parts) {
    if (cur == null) return key
    cur = cur[p]
  }
  return cur == null ? key : cur
}

export function pathLabel(locale, stepId) {
  return t(locale, `path.${stepId}`) || stepId
}

export function pathPlain(locale, stepId) {
  return t(locale, `pathPlain.${stepId}`) || ''
}
