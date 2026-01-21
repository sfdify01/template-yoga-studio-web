/**
 * Version Check Utility
 *
 * Periodically checks for new deployments and prompts users to reload
 * to ensure they're always running the latest version.
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_FILE = '/version.json';

interface VersionInfo {
  version: string;
  timestamp: string;
  branch: string;
}

let currentVersion: string | null = null;
let checkInterval: NodeJS.Timeout | null = null;

/**
 * Fetch the current version from the server
 */
async function fetchVersion(): Promise<VersionInfo | null> {
  try {
    const response = await fetch(`${VERSION_FILE}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.warn('Version file not found - skipping version check');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch version info:', error);
    return null;
  }
}

/**
 * Check if a new version is available
 */
async function checkForNewVersion(): Promise<boolean> {
  const versionInfo = await fetchVersion();

  if (!versionInfo) {
    return false;
  }

  // First time checking - just store the version
  if (currentVersion === null) {
    currentVersion = versionInfo.version;
    console.log('Current version:', currentVersion);
    return false;
  }

  // Check if version has changed
  if (versionInfo.version !== currentVersion) {
    console.log('New version detected:', versionInfo.version);
    return true;
  }

  return false;
}

/**
 * Prompt user to reload the page
 */
function promptReload(): void {
  // Show a user-friendly notification
  if (confirm('A new version of the app is available! Click OK to reload and get the latest features.')) {
    window.location.reload();
  } else {
    // If user declines, check again in 1 minute
    setTimeout(() => {
      if (confirm('Please reload to get the latest version of the app.')) {
        window.location.reload();
      }
    }, 60 * 1000);
  }
}

/**
 * Start version checking
 */
export function startVersionCheck(): void {
  // Stop any existing check
  stopVersionCheck();

  // Initial version fetch
  fetchVersion().then(versionInfo => {
    if (versionInfo) {
      currentVersion = versionInfo.version;
      console.log('Version check started. Current version:', currentVersion);
    }
  });

  // Check periodically
  checkInterval = setInterval(async () => {
    const hasNewVersion = await checkForNewVersion();
    if (hasNewVersion) {
      promptReload();
    }
  }, VERSION_CHECK_INTERVAL);
}

/**
 * Stop version checking
 */
export function stopVersionCheck(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

/**
 * Get current version info
 */
export async function getCurrentVersion(): Promise<VersionInfo | null> {
  return fetchVersion();
}
