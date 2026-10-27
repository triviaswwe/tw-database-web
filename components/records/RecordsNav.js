// components/records/RecordsNav.js
import React from "react";
import Link from "next/link";

const SECTIONS = [
  { id: "general", label: "General Records" },
  { id: "slammy-awards", label: "Slammy Awards" },
];

export default function RecordsNav({ currentSection, currentType }) {
  return (
    <div className="space-y-4 mb-6">
      {/* Level 1: Main Section Tabs */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800">
        {SECTIONS.map((sec) => {
          const isActive = currentSection === sec.id;
          return (
            <Link
              key={sec.id}
              href={`/records/${sec.id}/${currentType}`}
              className={`pb-2 px-1 border-b-2 font-medium text-base md:text-lg transition-colors cursor-pointer ${
                isActive
                  ? "border-blue-500 text-blue-600 dark:text-sky-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {sec.label}
            </Link>
          );
        })}
      </div>

      {/* Level 2: Subgroup Tabs (Entity) */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800">
        <Link
          href={`/records/${currentSection}/wrestler`}
          className={`pb-2 px-1 border-b-2 font-medium text-base md:text-lg transition-colors cursor-pointer ${
            currentType === "wrestler"
              ? "border-blue-500 text-blue-600 dark:text-sky-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Per Wrestler
        </Link>
        <Link
          href={`/records/${currentSection}/interpreter`}
          className={`pb-2 px-1 border-b-2 font-medium text-base md:text-lg transition-colors cursor-pointer ${
            currentType === "interpreter"
              ? "border-blue-500 text-blue-600 dark:text-sky-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Per Interpreter
        </Link>
      </div>
    </div>
  );
}
