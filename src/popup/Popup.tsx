import React, { useEffect, useState } from "react";
import {
  CHANGELOG_KEY,
  CHECK_IN_PROGRESS_KEY,
  CHECK_PROGRESS_KEY,
  FETCH_ERRORS_KEY,
  LAST_CHECK_KEY,
  NON_RETRYABLE_ERRORS,
  RETRY_EXTENSION_ACTION,
  TRIGGER_CHECK_ACTION,
} from "../consts";
import {
  IChangelogEntry,
  IExtensionCheckResult,
  IFetchError,
  ILastUpdatedData,
} from "../interfaces";
import logo from "../logo.png";
import Diff from "./Diff";
import "./popup.css";

const ONE_HOUR_MS = 60 * 60 * 1000;

function flattenEntry(entry: IChangelogEntry["before" | "after"]) {
  return {
    extensionId: entry.extensionId,
    extensionName: entry.extensionName,
    ...entry.developerData,
  };
}

function statusIcon(status: IExtensionCheckResult["status"]) {
  switch (status) {
    case "pending":
      return "○";
    case "checking":
      return "◌";
    case "success":
      return "✓";
    case "error":
      return "✗";
  }
}

function statusColor(status: IExtensionCheckResult["status"]) {
  switch (status) {
    case "pending":
      return "text-gray-400";
    case "checking":
      return "text-blue-500";
    case "success":
      return "text-green-600";
    case "error":
      return "text-red-500";
  }
}

const Popup = () => {
  const [changelogData, setChangelogData] = useState<IChangelogEntry[] | null>(
    null
  );
  const [lastUpdatedData, setLastUpdatedData] =
    useState<ILastUpdatedData | null>(null);
  const [fetchErrors, setFetchErrors] = useState<IFetchError[]>([]);
  const [checkInProgress, setCheckInProgress] = useState(false);
  const [checkProgress, setCheckProgress] = useState<IExtensionCheckResult[]>(
    []
  );


  useEffect(() => {
    updateData();

    chrome.storage.local.onChanged.addListener(updateData);
    return () => chrome.storage.local.onChanged.removeListener(updateData);
  }, []);

  async function updateData() {
    updateChangelogData();

    const lastUpdated: ILastUpdatedData | null =
      (await chrome.storage.local.get(LAST_CHECK_KEY))[LAST_CHECK_KEY] ?? null;
    setLastUpdatedData(lastUpdated);

    const errors: IFetchError[] =
      (await chrome.storage.local.get(FETCH_ERRORS_KEY))[FETCH_ERRORS_KEY] ??
      [];
    setFetchErrors(errors);

    const inProgress: boolean =
      (await chrome.storage.local.get(CHECK_IN_PROGRESS_KEY))[
        CHECK_IN_PROGRESS_KEY
      ] ?? false;
    setCheckInProgress(inProgress);

    const progress: IExtensionCheckResult[] =
      (await chrome.storage.local.get(CHECK_PROGRESS_KEY))[
        CHECK_PROGRESS_KEY
      ] ?? [];
    setCheckProgress(progress);
  }

  async function updateChangelogData() {
    const changelogResult: IChangelogEntry[] =
      (await chrome.storage.local.get(CHANGELOG_KEY))[CHANGELOG_KEY] ?? [];
    setChangelogData(changelogResult);
  }

  async function clearChangelog() {
    await chrome.storage.local.set({ [CHANGELOG_KEY]: [] });
    await updateChangelogData();
    chrome.action.setBadgeText({ text: "" });
  }

  function triggerCheck() {
    chrome.runtime.sendMessage({ action: TRIGGER_CHECK_ACTION });
  }

  function retryExtension(extensionId: string) {
    chrome.runtime.sendMessage({
      action: RETRY_EXTENSION_ACTION,
      extensionId,
    });
  }

  function isRetryable(error: string | null): boolean {
    if (!error) return false;
    return !NON_RETRYABLE_ERRORS.some((msg) => error.includes(msg));
  }

  const isStale =
    !lastUpdatedData ||
    Date.now() - new Date(lastUpdatedData.timestamp).getTime() > ONE_HOUR_MS;

  const showCheckButton = isStale && !checkInProgress;

  const completedCount = checkProgress.filter(
    (r) => r.status === "success" || r.status === "error"
  ).length;
  const totalCount = checkProgress.length;

  return (
    <div className="m-8 font-light flex flex-col items-stretch gap-8">
      <div className="flex flex-row gap-8 items-start">
        <img className="w-14 rounded-xl overflow-hidden" src={logo}></img>
        <div className="flex flex-col flex-grow">
          <h1 className="text-blue-700 text-2xl">
            Extension Developer Changelog
          </h1>
          <div className="flex flex-row justify-between items-center">
            <span>
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
        </div>

        <div className="flex flex-col gap-2 items-end">
          <button
            class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded border border-red-700"
            onClick={() => clearChangelog()}
          >
            CLEAR
          </button>
          {showCheckButton && (
            <button
              class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded border border-blue-700"
              onClick={() => triggerCheck()}
            >
              Check Now
            </button>
          )}
          {checkInProgress && (
            <button
              class="bg-gray-400 text-white font-bold py-2 px-4 rounded border border-gray-500 cursor-not-allowed"
              disabled
            >
              Checking... ({completedCount}/{totalCount})
            </button>
          )}
        </div>
      </div>

      {changelogData && changelogData.length > 0 ? (
        changelogData.map((entry: IChangelogEntry, i: number) => (
          <Diff
            key={i}
            obj1={flattenEntry(entry.before)}
            obj2={flattenEntry(entry.after)}
          ></Diff>
        ))
      ) : (
        <span>No changes detected.</span>
      )}

      {fetchErrors.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-orange-600">Fetch Errors</h2>
          {fetchErrors.map((err: IFetchError, i: number) => (
            <div
              key={i}
              className="p-4 border border-orange-300 rounded bg-orange-50 text-sm"
            >
              <span className="font-bold">{err.extensionName}</span>
              <span className="text-gray-500 ml-2">({err.extensionId})</span>
              <div className="text-red-600 mt-1">{err.error}</div>
            </div>
          ))}
        </div>
      )}

      {checkProgress.length > 0 && (
        <div className="border border-gray-200 rounded-lg">
          <div className="px-4 py-3">
            <span className="font-bold text-sm text-gray-700">
              Extension Check Status ({completedCount}/{totalCount})
            </span>
          </div>
          <div className="border-t border-gray-200">
            {checkProgress.map(
              (result: IExtensionCheckResult, i: number) => (
                <div
                  key={i}
                  className="px-4 py-2 flex flex-row items-start gap-3 text-sm border-b border-gray-100 last:border-b-0"
                >
                  <span className={`font-mono ${statusColor(result.status)}`}>
                    {statusIcon(result.status)}
                  </span>
                  <div className="flex flex-col flex-grow min-w-0">
                    <span className="font-medium truncate">
                      {result.extensionName}
                    </span>
                    {result.status === "success" && result.developerName && (
                      <span className="text-gray-500 text-xs">
                        Developer: {result.developerName}
                      </span>
                    )}
                    {result.status === "error" && result.error && (
                      <div className="flex flex-row items-center gap-2">
                        <span className="text-red-500 text-xs truncate">
                          {result.error}
                        </span>
                        {isRetryable(result.error) && (
                          <button
                            class="text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                            onClick={() =>
                              retryExtension(result.extensionId)
                            }
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                    {result.timestamp && (
                      <span className="text-gray-400 text-xs">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Popup;
