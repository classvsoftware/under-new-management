import { PageData } from "./interfaces";

export async function getFirefoxExtensionMetadata(
  extensionId: string,
  locale: string = "en-US"
): Promise<PageData> {
  const targetUrl = `https://addons.mozilla.org/api/v5/addons/addon/${extensionId}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch Firefox addon data: ${response.status}`);
  }

  const addonInfo = await response.json();

  return {
    extensionData: {
      extensionId,
      extensionName: addonInfo.name?.[locale] ?? "",
      extensionIconUrl: "",
      extensionRating: 0,
      extensionCategory: null,
      ratingCount: 0,
      roundedExtensionRating: 0,
      extensionDescription: "",
      installCount: 0,
      installCountSuffix: "",
      version: addonInfo.current_version?.version ?? null,
      lastUpdated: addonInfo.last_updated ?? null,
    },
    developerData: {
      developerName:
        (addonInfo.authors ?? []).map((u: any) => u.id).join(",") || null,
      developerWebsite: addonInfo.homepage?.url?.[locale] ?? null,
      developerEmail: addonInfo.support_email?.[locale] ?? null,
      offeredByName:
        (addonInfo.authors ?? []).map((u: any) => u.name).join(",") || null,
      developerAccountId: null,
    },
    recommendations: [],
  };
}
