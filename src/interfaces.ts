import { ExtensionDeveloperData } from "./metadata/interfaces";

export interface StoredExtensionData {
  extensionId: string;
  extensionName: string;
  developerData: ExtensionDeveloperData;
}

export interface StoredExtensionsState {
  extensions: StoredExtensionData[];
}

export interface IChangelogEntry {
  timestamp: string;
  beforeTimestamp: string | null;
  afterTimestamp: string;
  before: StoredExtensionData;
  after: StoredExtensionData;
}

export interface ILastUpdatedData {
  timestamp: string;
}

export interface IFetchError {
  extensionId: string;
  extensionName: string;
  error: string;
  timestamp: string;
}

export type CheckStatus = "pending" | "checking" | "success" | "error";

export interface IExtensionCheckResult {
  extensionId: string;
  extensionName: string;
  status: CheckStatus;
  developerName: string | null;
  error: string | null;
  timestamp: string | null;
}

export interface IExtensionRowData {
  extensionId: string;
  extensionName: string;
  icons: chrome.management.IconInfo[] | undefined;
  installType: string;
  checkResult: IExtensionCheckResult | null;
  changelogEntries: IChangelogEntry[];
  storedData: StoredExtensionData | null;
}
