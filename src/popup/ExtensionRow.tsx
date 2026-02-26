import React from "react";
import { IExtensionRowData, IChangelogEntry } from "../interfaces";
import { NON_RETRYABLE_ERRORS } from "../consts";
import Diff from "./Diff";

function getBestIcon(
  icons: chrome.management.IconInfo[] | undefined
): string | null {
  if (!icons || icons.length === 0) return null;
  const preferred =
    icons.find((i) => i.size === 32) ??
    icons.find((i) => i.size === 48) ??
    icons.reduce((a, b) => (a.size > b.size ? a : b));
  return preferred.url;
}

function statusIcon(status: string | null) {
  switch (status) {
    case "pending":
      return "\u25CB";
    case "checking":
      return "\u25CC";
    case "success":
      return "\u2713";
    case "error":
      return "\u2717";
    default:
      return "\u2014";
  }
}

function statusColor(status: string | null) {
  switch (status) {
    case "pending":
      return "text-gray-400";
    case "checking":
      return "text-blue-500";
    case "success":
      return "text-green-600";
    case "error":
      return "text-red-500";
    default:
      return "text-gray-300";
  }
}

function isRetryable(error: string | null): boolean {
  if (!error) return false;
  return !NON_RETRYABLE_ERRORS.some((msg) => error.includes(msg));
}

function flattenEntry(entry: IChangelogEntry["before" | "after"]) {
  return {
    extensionId: entry.extensionId,
    extensionName: entry.extensionName,
    ...entry.developerData,
  };
}

interface ExtensionRowProps {
  row: IExtensionRowData;
  onDismiss: () => void;
  onRetry: () => void;
}

function installTypeLabel(installType: string): string | null {
  switch (installType) {
    case "sideload":
      return "Sideloaded";
    case "development":
      return "Developer mode";
    case "admin":
      return "Policy installed";
    case "other":
      return "Other";
    default:
      return null;
  }
}

const ExtensionRow: React.FC<ExtensionRowProps> = ({
  row,
  onDismiss,
  onRetry,
}) => {
  const iconUrl = getBestIcon(row.icons);
  const isStoreExtension = row.installType === "normal";
  const status = row.checkResult?.status ?? null;
  const hasChanges = row.changelogEntries.length > 0;
  const hasError = status === "error";
  const errorMessage = row.checkResult?.error ?? null;
  const timestamp = row.checkResult?.timestamp ?? null;
  const nonStoreLabel = installTypeLabel(row.installType);

  return (
    <div className={`border border-gray-200 rounded-lg p-4 flex flex-col gap-3${!isStoreExtension ? " opacity-60" : ""}`}>
      <div className="flex flex-row items-center gap-3">
        {iconUrl ? (
          <img className="w-8 h-8 rounded" src={iconUrl} alt="" />
        ) : (
          <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
            ?
          </div>
        )}

        <div className="flex flex-col flex-grow min-w-0">
          <span className="font-medium truncate">{row.extensionName}</span>
          {!isStoreExtension && (
            <span className="text-xs text-gray-400">{nonStoreLabel}</span>
          )}
          {isStoreExtension && timestamp && !hasError && (
            <span className="text-xs text-gray-500">
              Checked: {new Date(timestamp).toLocaleDateString()}{" "}
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
          {isStoreExtension && !timestamp && !hasError && (
            <span className="text-xs text-gray-400">Never checked</span>
          )}
        </div>

        {isStoreExtension && (
          <span className={`font-mono text-lg ${statusColor(status)}`}>
            {statusIcon(status)}
          </span>
        )}
      </div>

      {hasError && (
        <div className="flex flex-row items-center gap-2 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
          <span className="text-red-600 truncate flex-grow">
            {errorMessage}
          </span>
          {isRetryable(errorMessage) && (
            <button
              className="text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {hasChanges && (() => {
        const entry = row.changelogEntries[0];
        return (
          <div>
            <div className="text-xs text-gray-400 mb-1">
              Detected: {new Date(entry.timestamp).toLocaleString()}
            </div>
            <Diff
              obj1={flattenEntry(entry.before)}
              obj2={flattenEntry(entry.after)}
            />
          </div>
        );
      })()}

      {hasChanges && (
        <button
          className="self-end text-sm text-red-600 hover:text-red-800 font-medium"
          onClick={onDismiss}
        >
          Dismiss Changes
        </button>
      )}
    </div>
  );
};

export default ExtensionRow;
