import React, { useState } from "react";
import Diff from "./Diff";

const EXAMPLE_BEFORE = {
  extensionId: "abcdefghijklmnopabcdefghijklmnop",
  extensionName: "Example Extension",
  developerName: "Original Developer",
  developerEmail: "support@original-dev.com",
};

const EXAMPLE_AFTER = {
  extensionId: "abcdefghijklmnopabcdefghijklmnop",
  extensionName: "Example Extension",
  developerName: "Original Developer",
  developerEmail: "contact@new-owner.com",
};

const TutorialCard: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        className="text-sm text-blue-600 hover:text-blue-800 underline"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide" : "How does this work?"}
      </button>

      {expanded && (
        <div className="mt-3 border border-blue-200 bg-blue-50 rounded-lg p-4 flex flex-col gap-3 text-sm text-gray-700">
          <p>
            <strong>Under New Management</strong> periodically checks the Chrome
            Web Store listing for each of your installed extensions. If the
            developer metadata changes — such as the contact email — it may
            indicate the extension has been sold or transferred to a new owner.
          </p>
          <p>
            When a change is detected, a badge appears on the toolbar icon and
            the affected extension shows a diff like this:
          </p>

          <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 bg-white">
            <div className="flex flex-row items-center gap-3">
              <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                ?
              </div>
              <div className="flex flex-col flex-grow min-w-0">
                <span className="font-medium truncate">Example Extension</span>
                <span className="text-xs text-gray-400">Example</span>
              </div>
            </div>
            <Diff obj1={EXAMPLE_BEFORE} obj2={EXAMPLE_AFTER} />
          </div>

          <p>
            You can dismiss changes once you've reviewed them. Extensions not
            installed from the Chrome Web Store (sideloaded, developer mode,
            etc.) are shown but not checked.
          </p>
        </div>
      )}
    </div>
  );
};

export default TutorialCard;
