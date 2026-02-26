import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseChromeExtensionPage, ChromeParseResult } from "./chrome-parser";

function loadFixture(name: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, `../../fixtures/cws/${name}.html`),
    "utf8"
  );
}

describe("parseChromeExtensionPage", () => {
  describe("ublock-origin-lite", () => {
    let result: ChromeParseResult;

    it("parses without error", () => {
      result = parseChromeExtensionPage(loadFixture("ublock-origin-lite"));
    });

    it("extracts the correct extension ID", () => {
      expect(result.extensionId).toBe("ddkjiahejlhfcafbddmgiahcphecmpfh");
    });

    it("extracts developer email", () => {
      expect(result.developerData.developerEmail).toBe(
        "ubo@raymondhill.net"
      );
    });

    it("extracts offered by name", () => {
      expect(result.developerData.offeredByName).toBe(
        "Raymond Hill (gorhill)"
      );
    });

    it("finds the main extension in allExtensionData", () => {
      const main = result.allExtensionData.find(
        (e) => e.extensionId === "ddkjiahejlhfcafbddmgiahcphecmpfh"
      );
      expect(main).toBeDefined();
      expect(main!.extensionName).toBe("uBlock Origin Lite");
      expect(main!.extensionRating).toBeGreaterThan(4);
      expect(main!.ratingCount).toBeGreaterThan(0);
      expect(main!.installCount).toBeGreaterThanOrEqual(15000000);
    });

    it("finds recommendation extensions", () => {
      expect(result.allExtensionData.length).toBeGreaterThan(1);
    });
  });

  describe("chatgpt-search", () => {
    let result: ChromeParseResult;

    it("parses without error", () => {
      result = parseChromeExtensionPage(loadFixture("chatgpt-search"));
    });

    it("extracts the correct extension ID", () => {
      expect(result.extensionId).toBe("ejcfepkfckglbgocfkanmcdngdijcgld");
    });

    it("extracts developer website", () => {
      expect(result.developerData.developerWebsite).toBe(
        "https://chatgpt.com"
      );
    });

    it("finds the main extension in allExtensionData", () => {
      const main = result.allExtensionData.find(
        (e) => e.extensionId === "ejcfepkfckglbgocfkanmcdngdijcgld"
      );
      expect(main).toBeDefined();
      expect(main!.extensionName).toBe("ChatGPT search");
      expect(main!.installCount).toBeGreaterThanOrEqual(4000000);
    });

    it("finds recommendation extensions", () => {
      expect(result.allExtensionData.length).toBeGreaterThan(1);
    });
  });

  describe("bitwarden", () => {
    let result: ChromeParseResult;

    it("parses without error", () => {
      result = parseChromeExtensionPage(loadFixture("bitwarden"));
    });

    it("extracts the correct extension ID", () => {
      expect(result.extensionId).toBe("nngceckbapebfimnlniiiahkandclblb");
    });

    it("extracts developer email", () => {
      expect(result.developerData.developerEmail).toBe(
        "hello@bitwarden.com"
      );
    });

    it("extracts developer website", () => {
      expect(result.developerData.developerWebsite).toBe(
        "https://bitwarden.com/"
      );
    });

    it("finds the main extension in allExtensionData", () => {
      const main = result.allExtensionData.find(
        (e) => e.extensionId === "nngceckbapebfimnlniiiahkandclblb"
      );
      expect(main).toBeDefined();
      expect(main!.extensionName).toBe("Bitwarden Password Manager");
      expect(main!.installCount).toBeGreaterThanOrEqual(6000000);
    });

    it("finds recommendation extensions", () => {
      expect(result.allExtensionData.length).toBeGreaterThan(1);
    });
  });

  describe("allExtensionData structure", () => {
    it("every entry has required fields with correct types", () => {
      const result = parseChromeExtensionPage(
        loadFixture("ublock-origin-lite")
      );

      for (const ext of result.allExtensionData) {
        expect(ext.extensionId).toMatch(/^[a-z]{32}$/);
        expect(typeof ext.extensionName).toBe("string");
        expect(typeof ext.extensionIconUrl).toBe("string");
        expect(typeof ext.extensionRating).toBe("number");
        expect(typeof ext.ratingCount).toBe("number");
        expect(typeof ext.roundedExtensionRating).toBe("number");
        expect(typeof ext.extensionDescription).toBe("string");
        expect(typeof ext.installCount).toBe("number");
        expect(typeof ext.installCountSuffix).toBe("string");
      }
    });
  });

  describe("error cases", () => {
    it("throws on empty HTML", () => {
      expect(() => parseChromeExtensionPage("")).toThrow();
    });

    it("throws on HTML with no canonical link", () => {
      expect(() =>
        parseChromeExtensionPage("<html><head></head><body></body></html>")
      ).toThrow("Could not find canonical link");
    });
  });
});
