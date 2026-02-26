import React, { useEffect, useMemo, useState } from "react";
import {
  CHANGELOG_KEY,
  CHECK_IN_PROGRESS_KEY,
  CHECK_PROGRESS_KEY,
  FETCH_ERRORS_KEY,
  LAST_CHECK_KEY,
  PREVIOUS_EXTENSIONS_STATE_KEY,
  RETRY_EXTENSION_ACTION,
  TRIGGER_CHECK_ACTION,
} from "../consts";
import {
  IChangelogEntry,
  IExtensionCheckResult,
  IExtensionRowData,
  ILastUpdatedData,
} from "../interfaces";
import logo from "../logo.png";
import ExtensionRow from "./ExtensionRow";
import TutorialCard from "./TutorialCard";
import "./popup.css";

const ONE_HOUR_MS = 60 * 60 * 1000;

function buildExtensionRows(
  extensions: chrome.management.ExtensionInfo[],
  checkResults: IExtensionCheckResult[],
  changelog: IChangelogEntry[]
): IExtensionRowData[] {
  const checkMap = new Map(checkResults.map((r) => [r.extensionId, r]));

  const changelogMap = new Map<string, IChangelogEntry[]>();
  for (const entry of changelog) {
    const id = entry.after.extensionId;
    if (!changelogMap.has(id)) changelogMap.set(id, []);
    changelogMap.get(id)!.push(entry);
  }

  return extensions
    .filter((ext) => ext.id !== chrome.runtime.id)
    .map((ext) => ({
      extensionId: ext.id,
      extensionName: ext.name,
      icons: ext.icons,
      installType: ext.installType,
      checkResult: checkMap.get(ext.id) ?? null,
      changelogEntries: changelogMap.get(ext.id) ?? [],
    }))
    .sort((a, b) => a.extensionName.localeCompare(b.extensionName));
}

const Popup = () => {
  const [installedExtensions, setInstalledExtensions] = useState<
    chrome.management.ExtensionInfo[]
  >([]);
  const [checkProgress, setCheckProgress] = useState<IExtensionCheckResult[]>(
    []
  );
  const [changelogData, setChangelogData] = useState<IChangelogEntry[]>([]);
  const [lastUpdatedData, setLastUpdatedData] =
    useState<ILastUpdatedData | null>(null);
  const [checkInProgress, setCheckInProgress] = useState(false);

  useEffect(() => {
    chrome.management.getAll().then(setInstalledExtensions);
    loadStorageData();

    function handleStorageChange(changes: {
      [key: string]: chrome.storage.StorageChange;
    }) {
      if (CHANGELOG_KEY in changes) {
        setChangelogData(changes[CHANGELOG_KEY].newValue ?? []);
      }
      if (CHECK_PROGRESS_KEY in changes) {
        setCheckProgress(changes[CHECK_PROGRESS_KEY].newValue ?? []);
      }
      if (CHECK_IN_PROGRESS_KEY in changes) {
        setCheckInProgress(changes[CHECK_IN_PROGRESS_KEY].newValue ?? false);
      }
      if (LAST_CHECK_KEY in changes) {
        setLastUpdatedData(changes[LAST_CHECK_KEY].newValue ?? null);
      }
    }

    chrome.storage.local.onChanged.addListener(handleStorageChange);
    return () =>
      chrome.storage.local.onChanged.removeListener(handleStorageChange);
  }, []);

  async function loadStorageData() {
    const result = await chrome.storage.local.get([
      CHANGELOG_KEY,
      CHECK_PROGRESS_KEY,
      CHECK_IN_PROGRESS_KEY,
      LAST_CHECK_KEY,
    ]);
    setChangelogData(result[CHANGELOG_KEY] ?? []);
    setCheckProgress(result[CHECK_PROGRESS_KEY] ?? []);
    setCheckInProgress(result[CHECK_IN_PROGRESS_KEY] ?? false);
    setLastUpdatedData(result[LAST_CHECK_KEY] ?? null);
  }

  // Clean up orphaned changelog entries for uninstalled extensions
  useEffect(() => {
    if (installedExtensions.length === 0 || changelogData.length === 0) return;

    const installedIds = new Set(installedExtensions.map((e: chrome.management.ExtensionInfo) => e.id));
    const hasOrphans = changelogData.some(
      (e: IChangelogEntry) => !installedIds.has(e.after.extensionId)
    );

    if (hasOrphans) {
      const cleaned = changelogData.filter((e: IChangelogEntry) =>
        installedIds.has(e.after.extensionId)
      );
      chrome.storage.local.set({ [CHANGELOG_KEY]: cleaned });
      chrome.action.setBadgeText({
        text: cleaned.length > 0 ? cleaned.length.toString() : "",
      });
    }
  }, [installedExtensions, changelogData]);

  const allRows = useMemo(
    () => buildExtensionRows(installedExtensions, checkProgress, changelogData),
    [installedExtensions, checkProgress, changelogData]
  );

  const storeRows = useMemo(
    () => allRows.filter((r: IExtensionRowData) => r.installType === "normal"),
    [allRows]
  );

  const nonStoreRows = useMemo(
    () => allRows.filter((r: IExtensionRowData) => r.installType !== "normal"),
    [allRows]
  );

  function triggerCheck() {
    chrome.runtime.sendMessage({ action: TRIGGER_CHECK_ACTION });
  }

  function retryExtension(extensionId: string) {
    chrome.runtime.sendMessage({
      action: RETRY_EXTENSION_ACTION,
      extensionId,
    });
  }

  async function dismissExtension(extensionId: string) {
    const current: IChangelogEntry[] =
      (await chrome.storage.local.get(CHANGELOG_KEY))[CHANGELOG_KEY] ?? [];
    const updated = current.filter(
      (entry: IChangelogEntry) => entry.after.extensionId !== extensionId
    );
    await chrome.storage.local.set({ [CHANGELOG_KEY]: updated });
    chrome.action.setBadgeText({
      text: updated.length > 0 ? updated.length.toString() : "",
    });
  }

  async function resetAndRecheck() {
    await chrome.storage.local.remove([
      PREVIOUS_EXTENSIONS_STATE_KEY,
      CHANGELOG_KEY,
      LAST_CHECK_KEY,
      FETCH_ERRORS_KEY,
      CHECK_PROGRESS_KEY,
      CHECK_IN_PROGRESS_KEY,
    ]);
    chrome.action.setBadgeText({ text: "" });
    chrome.runtime.sendMessage({ action: TRIGGER_CHECK_ACTION });
  }

  const isStale =
    !lastUpdatedData ||
    Date.now() - new Date(lastUpdatedData.timestamp).getTime() > ONE_HOUR_MS;
  const showCheckButton = isStale && !checkInProgress;

  const completedCount = checkProgress.filter(
    (r: IExtensionCheckResult) => r.status === "success" || r.status === "error"
  ).length;
  const totalCount = checkProgress.length;

  return (
    <div className="m-8 font-light flex flex-col items-stretch gap-6">
      <div className="flex flex-row gap-4 items-center">
        <img className="w-12 rounded-xl overflow-hidden" src={logo} alt="" />
        <div className="flex flex-col flex-grow">
          <h1 className="text-blue-700 text-xl font-normal">
            Under New Management
          </h1>
          <span className="text-xs text-gray-500">
            Last updated:{" "}
            {lastUpdatedData
              ? `${new Date(
                  lastUpdatedData.timestamp
                ).toLocaleDateString()} ${new Date(
                  lastUpdatedData.timestamp
                ).toLocaleTimeString()}`
              : "Never"}
          </span>
        </div>

        <div className="flex flex-col gap-2 items-end">
          {showCheckButton && (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded border border-blue-700 text-sm"
              onClick={triggerCheck}
            >
              Check Now
            </button>
          )}
          {checkInProgress && (
            <button
              className="bg-gray-400 text-white font-bold py-2 px-4 rounded border border-gray-500 cursor-not-allowed text-sm"
              disabled
            >
              Checking... ({completedCount}/{totalCount})
            </button>
          )}
          {!checkInProgress && (
            <button
              className="text-xs text-gray-400 hover:text-red-600 underline"
              onClick={resetAndRecheck}
            >
              Reset &amp; Recheck
            </button>
          )}
        </div>
      </div>

      <TutorialCard />

      {storeRows.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm text-gray-500 font-medium">Chrome Web Store Extensions</h2>
          {storeRows.map((row: IExtensionRowData) => (
            <ExtensionRow
              key={row.extensionId}
              row={row}
              onDismiss={() => dismissExtension(row.extensionId)}
              onRetry={() => retryExtension(row.extensionId)}
            />
          ))}
        </div>
      ) : (
        <span className="text-gray-500">No extensions installed.</span>
      )}

      {nonStoreRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm text-gray-400 font-medium">Not from Chrome Web Store (not checked)</h2>
          {nonStoreRows.map((row: IExtensionRowData) => (
            <ExtensionRow
              key={row.extensionId}
              row={row}
              onDismiss={() => dismissExtension(row.extensionId)}
              onRetry={() => retryExtension(row.extensionId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Popup;
