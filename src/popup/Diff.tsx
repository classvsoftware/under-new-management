import React from "react";

const Diff = ({ obj1, obj2 }) => {
  // Function to compare objects and find differences
  const findDifferences = (obj1, obj2) => {
    let diff = {
      added: {},
      removed: {},
      unchanged: {},
    };

    Object.keys(obj1).forEach((key) => {
      if (!obj2.hasOwnProperty(key)) {
        diff.removed[key] = obj1[key];
      } else if (obj1[key] === obj2[key]) {
        diff.unchanged[key] = obj1[key];
      }
    });

    Object.keys(obj2).forEach((key) => {
      if (!obj1.hasOwnProperty(key)) {
        diff.added[key] = obj2[key];
      } else if (obj1[key] !== obj2[key]) {
        diff.added[key] = obj2[key];
        if (!diff.removed.hasOwnProperty(key)) {
          diff.removed[key] = obj1[key];
        }
      }
    });

    return diff;
  };

  const differences = findDifferences(obj1, obj2);

  return (
    <div className="grid grid-cols-2 gap-8 p-8 border border-1 border-gray-200 rounded-lg">
      <div>
        <h2 className="text-lg font-bold">Before</h2>
        <pre>
          {Object.keys(differences.removed).map((key) => (
            <div key={key} className="text-red-500">
              {key}: {differences.removed[key] ?? "null"}
            </div>
          ))}
          {Object.keys(differences.unchanged).map((key) => (
            <div key={key} className="text-gray-500">
              {key}: {differences.unchanged[key] ?? "null"}
            </div>
          ))}
        </pre>
      </div>
      <div>
        <h2 className="text-lg font-bold">After</h2>
        <pre>
          {Object.keys(differences.added).map((key) => (
            <div key={key} className="text-green-500">
              {key}: {differences.added[key] ?? "null"}
            </div>
          ))}
          {Object.keys(differences.unchanged).map((key) => (
            <div key={key} className="text-gray-500">
              {key}: {differences.unchanged[key] ?? "null"}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

export default Diff;
