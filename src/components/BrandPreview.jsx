import { useEffect, useMemo, memo } from 'react'
import useAppStore from '../store/useAppStore'
import { TYPE_PAIRS } from '../lib/color'

const BrandPreview = memo(({ projectName }) => {
  const { tagline, typeHeading, typeBody, colors } = useAppStore((s) => s.brand ?? {})

  const previewData = useMemo(() => ({
    tagline: tagline || 'Your tagline here',
    headingFont: typeHeading || TYPE_PAIRS[0].heading,
    bodyFont: typeBody || TYPE_PAIRS[0].body,
    primaryColor: colors?.[0]?.value || '#2563EB',
    accentColor: colors?.[1]?.value || '#10B981',
  }), [tagline, typeHeading, typeBody, colors])

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">{projectName}</h3>
        {previewData.tagline && (
          <p className="text-lg text-muted-foreground mb-4" style={{ fontStyle: 'italic' }}>
            "{previewData.tagline}"
          </p>
        )}
        <div className="space-y-6">
          {/* Hero section */}
          <div className="aspect-w-16 aspect-h-9 bg-gradient-to-b from-gray-50 to-white rounded-lg p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ fontFamily: previewData.headingFont, color: '#111827' }}
              >
                Discover {projectName}
              </h1>
              <p
                className="text-lg text-muted-foreground"
                style={{ fontFamily: previewData.bodyFont, color: '#6B7280' }}
              >
                Experience the future of {projectName.toLowerCase()}
              </p>
              <button
                className="inline-flex items-center px-4 py-2 font-medium rounded-lg"
                style={{ backgroundColor: previewData.primaryColor, color: '#ffffff' }}
              >
                Get Started
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Available on iOS &amp; Android
              </span>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Feature One', 'Feature Two', 'Feature Three', 'Feature Four'].map((f) => (
              <div key={f} className="p-4 bg-white rounded-lg border border-gray-200">
                <h4
                  className="font-semibold mb-2"
                  style={{ fontFamily: previewData.headingFont, color: '#111827' }}
                >
                  {f}
                </h4>
                <p className="text-sm" style={{ fontFamily: previewData.bodyFont, color: '#6B7280' }}>
                  Lorem ipsum dolor sit amet.
                </p>
              </div>
            ))}
          </div>

          {/* Color palette */}
          <div className="flex gap-3">
            <div
              className="flex-1 h-12 rounded-lg"
              style={{ background: previewData.primaryColor }}
              title={previewData.primaryColor}
            />
            <div
              className="flex-1 h-12 rounded-lg"
              style={{ background: previewData.accentColor }}
              title={previewData.accentColor}
            />
            <div className="flex-1 bg-gray-200 h-12 rounded-lg" title="Background" />
            <div className="flex-1 bg-white h-12 rounded-lg border" title="Surface" />
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <p className="mb-1"><strong>Typography:</strong> {previewData.headingFont} / {previewData.bodyFont}</p>
        <p className="mb-1"><strong>Primary Color:</strong> {previewData.primaryColor}</p>
        <p><strong>Accent Color:</strong> {previewData.accentColor}</p>
      </div>
    </div>
  )
})

export default BrandPreview
