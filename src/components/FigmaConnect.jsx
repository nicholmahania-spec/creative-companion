import { useState } from 'react';
import { useFigma } from '../hooks/useFigma';
import Button from '../ui/Button';

const FigmaConnect = () => {
  const {
    isInitialized,
    isAuthenticated,
    user,
    error,
    isLoading,
    login,
    logout,
    getFile,
    importDesign,
    isConfigured,
    hasSession
  } = useFigma();

  const [fileKey, setFileKey] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  if (!isConfigured) {
    return (
      <div className="p-6 bg-red-50 border-l-4 border-red-500">
        <h3 className="text-red-800 font-bold mb-2">Figma Integration Not Configured</h3>
        <p className="text-red-700">
          To enable Figma integration, please add your Figma Client ID and Client Secret to your
          <code className="bg-gray-200 px-1 py-0.5 rounded">.env.local</code> file:
        </p>
        <pre className="mt-2 p-3 bg-gray-100 rounded overflow-auto text-xs">
VITE_FIGMA_CLIENT_ID=your_client_id_here
VITE_FIGMA_CLIENT_SECRET=your_client_secret_here
        </pre>
        <p className="mt-3 text-sm text-gray-500">
          Get these values from <a href="https://www.figma.com/settings" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Figma Settings → Personal Access Tokens</a>
        </p>
      </div>
    );
  }

  if (!isInitialized) {
    return <div className="text-center py-8">Initializing Figma integration...</div>;
  }

  const handleFileImport = async (e) => {
    e.preventDefault();
    if (!fileKey.trim()) return;

    setImportLoading(true);
    try {
      const result = await importDesign(fileKey.trim(), { extractColors: true });
      setImportResult(result);
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isAuthenticated ? (
        <>
          <h2 className="text-xl font-bold">Connect to Figma</h2>
          <p className="text-gray-600">
            Connect your Figma account to import designs, extract colors, and sync assets directly into your Creative Companion projects.
          </p>
          <Button
            variant="primary"
            onClick={login}
            isLoading={isLoading}
            className="w-full"
          >
            {isLoading ? 'Connecting...' : 'Connect to Figma'}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="font-medium">{user?.name || 'Connected'}</h3>
              <p className="text-sm text-gray-500">@{user?.handle || 'figma_user'}</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={logout}
            className="w-full"
          >
            Disconnect from Figma
          </button>

          <div className="space-y-4">
            <h3="text-lg font-semibold mb-3">Import Design from Figma</h3>
            <form onSubmit={handleFileImport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Figma File URL or ID:</label>
                <input
                  type="text"
                  value={fileKey}
                  onChange={(e) => setFileKey(e.target.value)}
                  placeholder="https://www.figma.com/file/FILE_ID/FILE-NAME or just FILE_ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You can paste either the full Figma URL or just the file ID (the alphanumeric code in the URL)
                </p>
              </div>

              <button
                type="submit"
                disabled={importLoading || !fileKey.trim()}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importLoading ? 'Importing...' : 'Import Design'}
              </button>
            </form>

            {importResult && (
              <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500">
                <h3 className="font-semibold mb-3">Import Successful!</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">File:</span> {importResult.file?.name}
                  </div>
                  <div>
                    <span className="font-medium">Imported at:</span> {new Date(importResult.metadata?.importedAt || Date.now()).toLocaleString()}
                  </div>
                  {importResult.colors && importResult.colors.length > 0 && (
                    <div>
                      <span className="font-medium">Colors extracted:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {importResult.colors.slice(0, 10).map((color, index) => (
                          <span
                            key={index}
                            className="inline-flex h-8 w-8 items-center justify-center rounded text-xs font-medium"
                            style={{ backgroundColor: color, color: getTextColorForBackground(color) }}
                          >
                            {color}
                          </span>
                        ))}
                        {importResult.colors.length > 10 && (
                          <span className="px-2 py-1 text-xs bg-gray-200 rounded">
                            +{importResult.colors.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Helper function to determine text color based on background
const getTextColorForBackground = (bgColor) => {
  // Simple heuristic: if the color is light, use dark text; if dark, use light text
  // Remove # if present
  const hex = bgColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 125 ? '#000000' : '#FFFFFF';
};

export default FigmaConnect;