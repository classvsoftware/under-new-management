import {
  ALARM_INTERVAL_MIN,
  CHANGELOG_KEY,
  CHECK_IN_PROGRESS_KEY,
  CHECK_PROGRESS_KEY,
  FETCH_ERRORS_KEY,
  LAST_CHECK_KEY,
  PREVIOUS_EXTENSIONS_STATE_KEY,
  RED_BADGE_COLOR,
  RETRY_EXTENSION_ACTION,
  TRIGGER_CHECK_ACTION,
} from "./consts";
import {
  IChangelogEntry,
  IExtensionCheckResult,
  IFetchError,
  StoredExtensionData,
  StoredExtensionsState,
} from "./interfaces";
import { getExtensionMetadata } from "./metadata";

chrome.alarms.create("hourlyAlarm", { periodInMinutes: ALARM_INTERVAL_MIN });

chrome.action.setBadgeBackgroundColor({ color: RED_BADGE_COLOR });

chrome.alarms.onAlarm.addListener(() => {
  updateDeveloperData();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === TRIGGER_CHECK_ACTION) {
    updateDeveloperData().then(() => sendResponse({ done: true }));
    return true;
  }
  if (message.action === RETRY_EXTENSION_ACTION && message.extensionId) {
    retryExtension(message.extensionId).then(() =>
      sendResponse({ done: true })
    );
    return true;
  }
});

async function retryExtension(extensionId: string) {
  const progress: IExtensionCheckResult[] =
    (await chrome.storage.local.get(CHECK_PROGRESS_KEY))[CHECK_PROGRESS_KEY] ??
    [];

  const idx = progress.findIndex((r) => r.extensionId === extensionId);
  if (idx === -1) return;

  progress[idx] = { ...progress[idx], status: "checking", error: null };
  await chrome.storage.local.set({ [CHECK_PROGRESS_KEY]: [...progress] });

  try {
    const pageData = await getExtensionMetadata(extensionId);
    const developerName = pageData.developerData.developerName;

    progress[idx] = {
      ...progress[idx],
      status: "success",
      developerName,
      error: null,
      timestamp: new Date().toISOString(),
    };

    // Update stored extensions state
    const storedState: StoredExtensionsState = (
      await chrome.storage.local.get(PREVIOUS_EXTENSIONS_STATE_KEY)
    )[PREVIOUS_EXTENSIONS_STATE_KEY] ?? { extensions: [] };

    const extName =
      pageData.extensionData.extensionName || progress[idx].extensionName;

    const existingIdx = storedState.extensions.findIndex(
      (e) => e.extensionId === extensionId
    );
    const newEntry: StoredExtensionData = {
      extensionId,
      extensionName: extName,
      developerData: pageData.developerData,
    };

    if (existingIdx !== -1) {
      storedState.extensions[existingIdx] = newEntry;
    } else {
      storedState.extensions.push(newEntry);
    }

    await chrome.storage.local.set({
      [PREVIOUS_EXTENSIONS_STATE_KEY]: storedState,
    });

    // Remove this extension from fetch errors
    const fetchErrors: IFetchError[] =
      (await chrome.storage.local.get(FETCH_ERRORS_KEY))[FETCH_ERRORS_KEY] ??
      [];
    await chrome.storage.local.set({
      [FETCH_ERRORS_KEY]: fetchErrors.filter(
        (e) => e.extensionId !== extensionId
      ),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    progress[idx] = {
      ...progress[idx],
      status: "error",
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }

  await chrome.storage.local.set({ [CHECK_PROGRESS_KEY]: [...progress] });
}

async function updateDeveloperData() {
  // Set in-progress flag
  await chrome.storage.local.set({ [CHECK_IN_PROGRESS_KEY]: true });

  const allExtensions = await chrome.management.getAll();
  // Only check extensions installed from the Chrome Web Store
  const installedExtensions = allExtensions.filter(
    (ext) => ext.installType === "normal"
  );

  // Initialize progress with all extensions as pending
  const progress: IExtensionCheckResult[] = installedExtensions.map((ext) => ({
    extensionId: ext.id,
    extensionName: ext.name,
    status: "pending" as const,
    developerName: null,
    error: null,
    timestamp: null,
  }));
  await chrome.storage.local.set({ [CHECK_PROGRESS_KEY]: progress });

  const previousState: StoredExtensionsState = (
    await chrome.storage.local.get(PREVIOUS_EXTENSIONS_STATE_KEY)
  )[PREVIOUS_EXTENSIONS_STATE_KEY] ?? { extensions: [] };

  const changelogData: IChangelogEntry[] =
    (await chrome.storage.local.get(CHANGELOG_KEY))[CHANGELOG_KEY] ?? [];

  const currentExtensions: StoredExtensionData[] = [];
  const fetchErrors: IFetchError[] = [];
  const timestamp = new Date().toISOString();

  for (let i = 0; i < installedExtensions.length; i++) {
    const ext = installedExtensions[i];

    // Mark this extension as checking
    progress[i] = { ...progress[i], status: "checking" };
    await chrome.storage.local.set({ [CHECK_PROGRESS_KEY]: [...progress] });

    try {
      const pageData = await getExtensionMetadata(ext.id);
      const developerName = pageData.developerData.developerName;

      currentExtensions.push({
        extensionId: ext.id,
        extensionName: pageData.extensionData.extensionName || ext.name,
        developerData: pageData.developerData,
      });

      progress[i] = {
        ...progress[i],
        status: "success",
        developerName,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      fetchErrors.push({
        extensionId: ext.id,
        extensionName: ext.name,
        error: errorMessage,
        timestamp,
      });

      progress[i] = {
        ...progress[i],
        status: "error",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }

    // Write progress after each extension
    await chrome.storage.local.set({ [CHECK_PROGRESS_KEY]: [...progress] });
  }

  const currentState: StoredExtensionsState = {
    extensions: currentExtensions,
  };

  const newChangelogEntries = generateNewChangelogEntries(
    previousState,
    currentState
  );

  // Merge: one entry per extension, keeping the original "before"
  const changelogMap = new Map(
    changelogData.map((e) => [e.after.extensionId, e])
  );
  for (const entry of newChangelogEntries) {
    const existing = changelogMap.get(entry.after.extensionId);
    if (existing) {
      // Preserve the original "before", update "after" and timestamp
      changelogMap.set(entry.after.extensionId, {
        timestamp: entry.timestamp,
        before: existing.before,
        after: entry.after,
      });
    } else {
      changelogMap.set(entry.after.extensionId, entry);
    }
  }
  const updatedChangelogData: IChangelogEntry[] = Array.from(
    changelogMap.values()
  );

  let badgeText = "";
  if (updatedChangelogData.length > 0) {
    badgeText = updatedChangelogData.length.toString();
  }

  if (newChangelogEntries.length > 0) {
    chrome.storage.local.set({ [CHANGELOG_KEY]: updatedChangelogData });
  }

  chrome.action.setBadgeText({ text: badgeText });

  chrome.storage.local.set({
    [PREVIOUS_EXTENSIONS_STATE_KEY]: currentState,
  });

  chrome.storage.local.set({ [FETCH_ERRORS_KEY]: fetchErrors });

  chrome.storage.local.set({
    [LAST_CHECK_KEY]: { timestamp },
  });

  // Clear in-progress flag
  await chrome.storage.local.set({ [CHECK_IN_PROGRESS_KEY]: false });
}

function generateNewChangelogEntries(
  previousState: StoredExtensionsState,
  currentState: StoredExtensionsState
): IChangelogEntry[] {
  const timestamp = new Date().toISOString();
  const newEntries: IChangelogEntry[] = [];

  const currentMap = new Map(
    currentState.extensions.map((ext) => [ext.extensionId, ext])
  );

  for (const previous of previousState.extensions) {
    const current = currentMap.get(previous.extensionId);

    if (current && JSON.stringify(previous) !== JSON.stringify(current)) {
      newEntries.push({ timestamp, before: previous, after: current });
    }
  }

  return newEntries;
}

updateDeveloperData();
