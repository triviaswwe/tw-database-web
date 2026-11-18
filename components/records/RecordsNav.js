// components/records/RecordsNav.js
import React from "react";
import Link from "next/link";

const SECTIONS = [
  { id: "general", label: "General Records" },
  { id: "slammy-awards", label: "Slammy Awards" },
  { id: "distinctions", label: "Other Distinctions" },
  { id: "special-matches", label: "Special Matches" },
];

export default function RecordsNav({ currentSection, currentType }) {
  const specialSubType =
    currentSection === "special-matches" &&
    (currentType === "royal-rumble" || currentType === "elimination-chamber")
      ? currentType
      : "royal-rumble";

  return (
    <div className="space-y-4 mb-6">
      {/* Level 1: Main Section Tabs */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-gray-200 dark:border-gray-800">
        {SECTIONS.map((sec) => {
          const isActive = currentSection === sec.id;
          const href =
            sec.id === "special-matches"
              ? `/records/special-matches/${specialSubType}`
              : `/records/${sec.id}`;
          return (
            <Link
              key={sec.id}
              href={href}
              className={`pb-2 px-1 border-b-2 font-medium text-base md:text-lg transition-colors cursor-pointer whitespace-nowrap ${
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

      {/* Level 2: Special Matches Subdivisions */}
      {currentSection === "special-matches" && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/records/special-matches/royal-rumble"
            className={`pb-2 px-1 border-b-2 font-medium text-base md:text-lg transition-colors cursor-pointer whitespace-nowrap ${
              currentType === "royal-rumble"
                ? "border-blue-500 text-blue-600 dark:text-sky-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Royal Rumble
          </Link>
          <Link
            href="/records/special-matches/elimination-chamber"
            className={`pb-2 px-1 border-b-2 font-medium text-base md:text-lg transition-colors cursor-pointer whitespace-nowrap ${
              currentType === "elimination-chamber"
                ? "border-blue-500 text-blue-600 dark:text-sky-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Elimination Chamber
          </Link>
        </div>
      )}
    </div>
  );
}
