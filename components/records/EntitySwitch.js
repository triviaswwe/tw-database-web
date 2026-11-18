// components/records/EntitySwitch.js
import React from "react";

export default function EntitySwitch({ viewMode, onChange }) {
  return (
    <div
      role="group"
      aria-label="Entity view mode"
      className="no-screenshot inline-flex items-center rounded-lg bg-gray-200 dark:bg-zinc-800 p-0.5 border border-gray-300 dark:border-zinc-700"
    >
      <button
        type="button"
        onClick={() => onChange("wrestler")}
        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          viewMode === "wrestler"
            ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-sky-400 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        }`}
      >
        Per Wrestler
      </button>
      <button
        type="button"
        onClick={() => onChange("interpreter")}
        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          viewMode === "interpreter"
            ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-sky-400 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        }`}
      >
        Per Interpreter
      </button>
    </div>
  );
}
