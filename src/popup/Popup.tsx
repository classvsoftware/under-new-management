import React, { useEffect, useState } from "react";
import "./popup.css";

const Popup = () => {
  const [extensions, setExtensions] = useState([]);

  useEffect(() => {
    // Fetch extensions on component mount
    chrome.management.getAll((extensions) => {
      setExtensions(extensions);
    });
  }, []);

  const toggleNotifications = () => {
    chrome.permissions.contains(
      {
        permissions: ["notifications"],
      },
      (result) => {
        if (result) {
          // If permission is currently granted, revoke it
          chrome.permissions.remove(
            {
              permissions: ["notifications"],
            },
            (removed) => {
              if (removed) {
                alert("Notifications permission removed.");
              } else {
                alert("Failed to remove notifications permission.");
              }
            }
          );
        } else {
          // Request the permission
          chrome.permissions.request(
            {
              permissions: ["notifications"],
            },
            (granted) => {
              if (granted) {
                alert("Notifications permission granted.");
              } else {
                alert("Notifications permission denied.");
              }
            }
          );
        }
      }
    );
  };

  return (
    <div>
      <h1 className="text-red-500">Popup</h1>
      <div id="extensionsList">
        {extensions.map((extension) => (
          <div key={extension.id}>
            ID: {extension.id}, Name: {extension.name}
          </div>
        ))}
      </div>
      <button id="toggleNotifications" onClick={toggleNotifications}>
        Toggle Notifications Permission
      </button>
    </div>
  );
};

export default Popup;
