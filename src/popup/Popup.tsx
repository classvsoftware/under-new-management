import React, { useEffect, useState } from "react";
import { CHANGELOG_KEY, LAST_CHECK_KEY } from "../consts";
import { IChangelogEntry, ILastUpdatedData } from "../interfaces";
import logo from "../logo.png";
import Diff from "./Diff";
import "./popup.css";

const Popup = () => {
  const [changelogData, setChangelogData] = useState<IChangelogEntry[] | null>(
    null
  );
  const [lastUpdatedData, setLastUpdatedData] = useState<
    IChangelogEntry[] | null
  >(null);

  useEffect(() => {
    updateData();

    chrome.storage.local.onChanged.addListener(updateData);
  }, []);

  async function updateData() {
    updateChangelogData();

    const lastUpdatedData: ILastUpdatedData | null =
      (await chrome.storage.local.get(LAST_CHECK_KEY))[LAST_CHECK_KEY] ?? null;

    setLastUpdatedData(lastUpdatedData);
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
                : ""}
            </span>
          </div>
        </div>

        <button
          class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded border border-red-700"
          onClick={() => clearChangelog()}
        >
          CLEAR
        </button>
      </div>

      {changelogData && changelogData.length > 0 ? (
        changelogData.map((entry: IChangelogEntry) => (
          <Diff obj1={entry.before} obj2={entry.after}></Diff>
        ))
      ) : (
        <span>No changes detected.</span>
      )}
    </div>
  );
};

export default Popup;
