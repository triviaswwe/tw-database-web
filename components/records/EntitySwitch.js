// components/records/EntitySwitch.js
import React, { useState, useRef, useEffect } from "react";

export default function EntitySwitch({ viewMode, onChange }) {
  const rootRef = useRef(null);
  const [isCompact, setIsCompact] = useState(false);
  const isCompactRef = useRef(false);

  useEffect(() => {
    const rootEl = rootRef.current;
    const headerEl = rootEl?.closest(".justify-between");
    if (!headerEl) return;

    const checkFit = () => {
      const style = window.getComputedStyle(headerEl);
      const availableWidth =
        headerEl.clientWidth -
        (parseFloat(style.paddingLeft) || 0) -
        (parseFloat(style.paddingRight) || 0);
      const gap = parseFloat(style.columnGap || style.gap) || 8;
      const children = Array.from(headerEl.children);
      const fullSpans = Array.from(headerEl.querySelectorAll("[data-switch-full]"));
      const shortSpans = Array.from(headerEl.querySelectorAll("[data-switch-short]"));
      const screenshotLabels = Array.from(
        headerEl.querySelectorAll("[data-screenshot-label]")
      );

      const prevFullDisplays = fullSpans.map((el) => el.style.display);
      const prevShortDisplays = shortSpans.map((el) => el.style.display);
      const prevLabelDisplays = screenshotLabels.map((el) => el.style.display);
      const prevWhiteSpaces = children.map((ch) => ch.style.whiteSpace);
      let requiredFullWidth = 0;
      let requiredShortWidth = 0;

      const measureWidth = () =>
        children.reduce(
          (sum, ch) =>
            sum + Math.max(ch.scrollWidth, ch.getBoundingClientRect().width),
          0
        ) +
        gap * Math.max(0, children.length - 1) +
        4;

      try {
        screenshotLabels.forEach((el) => {
          el.style.display = "none";
        });
        children.forEach((ch) => {
          ch.style.whiteSpace = "nowrap";
        });

        fullSpans.forEach((el) => {
          el.style.display = "inline";
        });
        shortSpans.forEach((el) => {
          el.style.display = "none";
        });
        requiredFullWidth = measureWidth();

        fullSpans.forEach((el) => {
          el.style.display = "none";
        });
        shortSpans.forEach((el) => {
          el.style.display = "inline";
        });
        requiredShortWidth = measureWidth();
      } finally {
        fullSpans.forEach((el, idx) => {
          el.style.display = prevFullDisplays[idx];
        });
        shortSpans.forEach((el, idx) => {
          el.style.display = prevShortDisplays[idx];
        });
        screenshotLabels.forEach((el, idx) => {
          el.style.display = prevLabelDisplays[idx];
        });
        children.forEach((ch, idx) => {
          ch.style.whiteSpace = prevWhiteSpaces[idx];
        });
      }

      const nextCompact =
        requiredFullWidth > availableWidth &&
        requiredShortWidth <= availableWidth;
      if (nextCompact !== isCompactRef.current) {
        isCompactRef.current = nextCompact;
        setIsCompact(nextCompact);
      }
    };

    checkFit();

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(checkFit);
      observer.observe(headerEl);
    }
    window.addEventListener("resize", checkFit);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", checkFit);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Entity view mode"
      className="no-screenshot inline-flex items-center rounded-lg bg-gray-200 dark:bg-zinc-800 p-0.5 border border-gray-300 dark:border-zinc-700"
    >
      <button
        type="button"
        title="Per Wrestler"
        onClick={() => onChange("wrestler")}
        className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          viewMode === "wrestler"
            ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-sky-400 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        }`}
      >
        <span data-switch-full="true" className={isCompact ? "hidden" : "inline"}>
          Per Wrestler
        </span>
        <span data-switch-short="true" className={isCompact ? "inline" : "hidden"}>
          P.W
        </span>
      </button>
      <button
        type="button"
        title="Per Interpreter"
        onClick={() => onChange("interpreter")}
        className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          viewMode === "interpreter"
            ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-sky-400 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        }`}
      >
        <span data-switch-full="true" className={isCompact ? "hidden" : "inline"}>
          Per Interpreter
        </span>
        <span data-switch-short="true" className={isCompact ? "inline" : "hidden"}>
          P.I
        </span>
      </button>
    </div>
  );
}
