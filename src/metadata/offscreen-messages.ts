import { ExtensionData, ExtensionDeveloperData } from "./interfaces";

export const OFFSCREEN_ACTION = "PARSE_CHROME_WEB_STORE_HTML" as const;

export interface OffscreenRequest {
  action: typeof OFFSCREEN_ACTION;
  html: string;
}

export type OffscreenResponse =
  | {
      success: true;
      data: {
        extensionId: string;
        developerData: ExtensionDeveloperData;
        allExtensionData: ExtensionData[];
      };
    }
  | {
      success: false;
      error: string;
    };
