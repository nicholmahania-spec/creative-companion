import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore, { blankWorkspaceState, pickPersisted } from './useAppStore'

describe('Brief source asset association', () => {
  beforeEach(() => useAppStore.setState(blankWorkspaceState()))

  it('persists the canonical asset ref without creating package or provenance state', () => {
    const project = useAppStore.getState().createNewProject('A', '')
    useAppStore.getState().mergeDetectiveAnswers({
      existingAssetsFiles: [{ name: 'Existing logo.png', url: 'https://client.test/logo.png' }],
    }, project.id)

    useAppStore.getState().linkBriefAttachmentToAsset(
      project.id,
      'existingAssets',
      'https://client.test/logo.png',
      { kind: 'asset', id: 'brief-logo' }
    )

    const saved = useAppStore.getState().projects.find((item) => item.id === project.id)
    expect(saved.detective.existingAssetsFiles).toEqual([
      {
        name: 'Existing logo.png',
        url: 'https://client.test/logo.png',
        assetRef: { kind: 'asset', id: 'brief-logo' },
      },
    ])
    expect(saved.packageAssets).toEqual([])
    expect(pickPersisted(useAppStore.getState()).projects.find((item) => item.id === project.id)
      .detective.existingAssetsFiles[0].assetRef).toEqual({ kind: 'asset', id: 'brief-logo' })
  })
})
