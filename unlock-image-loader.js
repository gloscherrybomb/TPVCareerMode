// Unlock Image Loader Utility
// Handles loading unlock images with fallback to emoji

// Cache to avoid repeated failed attempts
const imageCache = new Map();

/**
 * Attempts to load an unlock image, trying multiple file extensions
 * @param {string} unlockId - The ID of the unlock (e.g., 'paceNotes')
 * @returns {Promise<string|null>} - Image URL if found, null if not
 */
async function loadUnlockImage(unlockId) {
  // Check cache first
  if (imageCache.has(unlockId)) {
    return imageCache.get(unlockId);
  }

  // Try extensions in order of preference
  const extensions = ['png', 'jpg', 'jpeg', 'webp'];

  for (const ext of extensions) {
    try {
      const url = `unlock-images/${unlockId}.${ext}`;
      await loadImage(url);
      // If successful, cache and return
      imageCache.set(unlockId, url);
      return url;
    } catch {
      // Try next extension
      continue;
    }
  }

  // No image found, cache null to avoid retrying
  imageCache.set(unlockId, null);
  return null;
}

/**
 * Helper to load a single image URL
 * @param {string} url - Image URL to load
 * @returns {Promise<void>} - Resolves if image loads, rejects if fails
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = url;
  });
}

/**
 * Clears the image cache (useful for testing or if images are updated)
 */
function clearImageCache() {
  imageCache.clear();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadUnlockImage,
    clearImageCache
  };
}

if (typeof window !== 'undefined') {
  window.unlockImageLoader = {
    loadUnlockImage,
    clearImageCache
  };
}
