import React from "react";

const Diff: React.FC<{ obj1: Record<string, any>; obj2: Record<string, any> }> = ({ obj1, obj2 }) => {
  const allKeys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));

  return (
    <table className="w-full text-sm border-collapse bg-gray-50 rounded-lg overflow-hidden">
      <thead>
        <tr className="text-left text-xs text-gray-500">
          <th className="px-3 py-2 font-medium">Field</th>
          <th className="px-3 py-2 font-medium">Old</th>
          <th className="px-3 py-2 font-medium">New</th>
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
  );
};

export default Diff;
