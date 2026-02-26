export interface ExtensionData {
  extensionId: string;
  extensionIconUrl: string;
  extensionName: string;
  extensionRating: number;
  ratingCount: number;
  roundedExtensionRating: number;
  extensionDescription: string;
  extensionCategory: string | null;
  installCount: number;
  installCountSuffix: string;
  version: string | null;
  lastUpdated: string | null;
}

export interface ExtensionDeveloperData {
  developerName: string | null;
  developerEmail: string | null;
  developerWebsite: string | null;
  offeredByName: string | null;
  developerAccountId: string | null;
}

export interface PageData {
  extensionData: ExtensionData;
  developerData: ExtensionDeveloperData;
  recommendations: ExtensionData[];
}
