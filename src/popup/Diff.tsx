import React, { useState } from "react";

interface DiffProps {
  obj1: Record<string, any>;
  obj2: Record<string, any>;
  oldTimestamp?: string | null;
  newTimestamp?: string | null;
}

const Diff: React.FC<DiffProps> = ({ obj1, obj2, oldTimestamp, newTimestamp }) => {
  const allKeys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));
  const hasChanges = allKeys.some((key) => (obj1[key] ?? null) !== (obj2[key] ?? null));
  const [expanded, setExpanded] = useState(hasChanges);

  const oldLabel = oldTimestamp
    ? `Old (${new Date(oldTimestamp).toLocaleDateString()} ${new Date(oldTimestamp).toLocaleTimeString()})`
    : "Old";
  const newLabel = newTimestamp
    ? `New (${new Date(newTimestamp).toLocaleDateString()} ${new Date(newTimestamp).toLocaleTimeString()})`
    : "New";

  return (
    <div>
      <button
        className="text-xs text-blue-600 hover:text-blue-800 underline mb-1"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide details" : "Show details"}
      </button>

      {expanded && (
        <table className="w-full text-sm border-collapse bg-gray-50 rounded-lg overflow-hidden">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">{oldLabel}</th>
              <th className="px-3 py-2 font-medium">{newLabel}</th>
            </tr>
          </thead>
          <tbody>
            {allKeys.map((key) => {
              const oldVal = obj1[key] ?? null;
              const newVal = obj2[key] ?? null;
              const changed = oldVal !== newVal;

              return (
                <tr key={key} className="border-t border-gray-200">
                  <td className="px-3 py-1.5 text-gray-600 font-medium">{key}</td>
                  <td className={`px-3 py-1.5 break-all${changed ? " bg-red-50 text-red-700" : " text-gray-500"}`}>
                    {String(oldVal ?? "null")}
                  </td>
                  <td className={`px-3 py-1.5 break-all${changed ? " bg-green-50 text-green-700" : " text-gray-500"}`}>
                    {String(newVal ?? "null")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Diff;
