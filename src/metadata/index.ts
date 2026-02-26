import { PageData } from "./interfaces";
import { getChromeExtensionMetadata } from "./chrome-web-store";
import { getFirefoxExtensionMetadata } from "./firefox-addons";

export { ExtensionData, ExtensionDeveloperData, PageData } from "./interfaces";

const CHROME_ID_REGEX = /^[a-z]{32}$/;
const FIREFOX_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getExtensionMetadata(
  extensionId: string,
  locale: string = "en-US"
): Promise<PageData> {
  if (CHROME_ID_REGEX.test(extensionId)) {
    return getChromeExtensionMetadata(extensionId, locale);
  }

  if (FIREFOX_UUID_REGEX.test(extensionId)) {
    return getFirefoxExtensionMetadata(extensionId, locale);
  }

  throw new Error(`Unrecognized extension ID format: ${extensionId}`);
}
