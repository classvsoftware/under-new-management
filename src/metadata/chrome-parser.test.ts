import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseChromeExtensionPage, ChromeParseResult } from "./chrome-parser";

const FIXTURES: { source: string; name: string; id: string }[] = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../fixtures/index.json"),
    "utf8"
  )
);

function loadFixture(name: string): string {
  const fixture = FIXTURES.find((f) => f.name === name);
  return fs.readFileSync(
    path.resolve(__dirname, `../../fixtures/${fixture!.source}/${name}.html`),
    "utf8"
  );
}

const EXPECTED = {
  "ublock-origin-lite": {
    extensionName: "uBlock Origin Lite",
    minInstallCount: 15000000,
    minRating: 4,
    developerName: null,
    developerAddress: null,
    developerEmail: "ubo@raymondhill.net",
    developerWebsite: null,
    offeredByName: "Raymond Hill (gorhill)",
  },
  "chatgpt-search": {
    extensionName: "ChatGPT search",
    minInstallCount: 4000000,
    minRating: 3,
    developerName: "OpenAI",
    developerAddress: "3180 18th St\nSan Francisco, CA 94110-2043\nUS",
    developerEmail: null,
    developerWebsite: "https://chatgpt.com",
    offeredByName: null,
  },
  bitwarden: {
    extensionName: "Bitwarden Password Manager",
    minInstallCount: 6000000,
    minRating: 4,
    developerName: "Bitwarden Inc.",
    developerAddress:
      "1 N Calle Cesar Chavez Suite 102\nSanta Barbara, CA 93103-5619\nUS",
    developerEmail: "hello@bitwarden.com",
    developerWebsite: "https://bitwarden.com/",
    offeredByName: null,
  },
  "capital-one-shopping": {
    extensionName: "Capital One Shopping: Save Now",
    minInstallCount: 11000000,
    minRating: 4,
    developerName: null,
    developerAddress: null,
    developerEmail: "help@capitaloneshopping.com",
    developerWebsite: "https://capitaloneshopping.com",
    offeredByName: null,
  },
  tampermonkey: {
    extensionName: "Tampermonkey",
    minInstallCount: 11000000,
    minRating: 4,
    developerName: null,
    developerAddress: null,
    developerEmail: "support@tampermonkey.net",
    developerWebsite: "http://tampermonkey.net/",
    offeredByName: null,
  },
};

describe("parseChromeExtensionPage", () => {
  const results: Record<string, ChromeParseResult> = {};

  for (const [fixture, expected] of Object.entries(EXPECTED)) {
    const fixtureId = FIXTURES.find((f) => f.name === fixture)!.id;

    describe(fixture, () => {
      it("parses without error", () => {
        results[fixture] = parseChromeExtensionPage(loadFixture(fixture));
      });

      it("extracts the correct extension ID", () => {
        expect(results[fixture].extensionId).toBe(fixtureId);
      });

      it("extracts developer name", () => {
        expect(results[fixture].developerData.developerName).toBe(
          expected.developerName
        );
      });

      it("extracts developer address", () => {
        expect(results[fixture].developerData.developerAddress).toBe(
          expected.developerAddress
        );
      });

      it("extracts developer email", () => {
        expect(results[fixture].developerData.developerEmail).toBe(
          expected.developerEmail
        );
      });

      it("extracts developer website", () => {
        expect(results[fixture].developerData.developerWebsite).toBe(
          expected.developerWebsite
        );
      });

      it("extracts offered by name", () => {
        expect(results[fixture].developerData.offeredByName).toBe(
          expected.offeredByName
        );
      });

      it("finds the main extension in allExtensionData", () => {
        const main = results[fixture].allExtensionData.find(
          (e) => e.extensionId === fixtureId
        );
        expect(main).toBeDefined();
        expect(main!.extensionName).toBe(expected.extensionName);
        expect(main!.extensionRating).toBeGreaterThan(expected.minRating);
        expect(main!.ratingCount).toBeGreaterThan(0);
        expect(main!.installCount).toBeGreaterThanOrEqual(
          expected.minInstallCount
        );
      });

      it("finds recommendation extensions", () => {
        expect(results[fixture].allExtensionData.length).toBeGreaterThan(1);
      });
    });
  }

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
