// components/MatchFilters.js
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, RotateCcw } from "lucide-react";

export default function MatchFilters({
  filterResults = [],
  toggleResult,
  filterFormats = [],
  toggleFormat,
  hasFormatFilter = true,
  filterTitle = false,
  toggleTitle,
  filterStip = false,
  toggleStip,
  selectedChamps = [],
  toggleChamp,
  selectedStips = [],
  toggleStipItem,
  selectedWrestlers = [],
  toggleWrestler,
  selectedShows,
  toggleShow,
  selectedEvents = [],
  toggleEvent,
  championshipsList = [],
  stipulationsList = [],
  wrestlersList = [],
  showsList,
  eventsList = [],
  onReset,
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchWrestler, setSearchWrestler] = useState("");
  const [searchShow, setSearchShow] = useState("");
  const [searchChamp, setSearchChamp] = useState("");
  const [searchStip, setSearchStip] = useState("");

  const activeShows = selectedShows !== undefined ? selectedShows : selectedEvents;
  const handleToggleShow = toggleShow || toggleEvent;
  const availableShows = showsList !== undefined ? showsList : eventsList;

  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasActiveFilters = Boolean(
    filterTitle ||
      filterStip ||
      filterResults.length < 3 ||
      filterFormats.length < 4 ||
      selectedChamps.length > 0 ||
      selectedStips.length > 0 ||
      selectedWrestlers.length > 0 ||
      activeShows.length > 0
  );

  const buttonBase =
    "w-full px-3 py-2 rounded font-semibold text-xs transition-colors flex items-center justify-between text-left select-none";

  const getDropdownButtonClass = (isActive, isOpen) => {
    if (isActive) {
      return `${buttonBase} bg-blue-600 text-white shadow`;
    }
    return `${buttonBase} bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-800 ${
      isOpen ? "ring-2 ring-blue-500/50" : ""
    }`;
  };

  const getPillButtonClass = (isActive) => {
    if (isActive) {
      return `${buttonBase} justify-center bg-blue-600 text-white shadow`;
    }
    return `${buttonBase} justify-center bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-800`;
  };

  return (
    <div ref={containerRef} className="w-full mb-6 space-y-3">
      {/* ─── FILA 1: Botones principales desplegables (ocupan todo el ancho) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
        {/* Dropdown 1: Wrestlers */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() =>
              setOpenDropdown(openDropdown === "wrestler" ? null : "wrestler")
            }
            className={getDropdownButtonClass(
              selectedWrestlers.length > 0,
              openDropdown === "wrestler"
            )}
          >
            <span className="truncate">
              Wrestlers
              {selectedWrestlers.length > 0 && ` (${selectedWrestlers.length})`}
            </span>
            <ChevronDown
              size={14}
              className={`shrink-0 ml-1 transition-transform duration-200 ${
                openDropdown === "wrestler" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openDropdown === "wrestler" && (
            <div className="absolute left-0 top-full mt-1.5 w-full min-w-[240px] max-w-sm max-h-72 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 p-2 text-xs">
              <input
                type="text"
                placeholder="Search wrestler..."
                value={searchWrestler}
                onChange={(e) => setSearchWrestler(e.target.value)}
                className="w-full mb-2 px-2.5 py-1.5 rounded border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {wrestlersList
                  .filter((w) =>
                    w.name.toLowerCase().includes(searchWrestler.toLowerCase())
                  )
                  .map((w) => {
                    const checked = selectedWrestlers.includes(w.name);
                    return (
                      <label
                        key={w.id || w.name}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWrestler(w.name)}
                          className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{w.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown 2: Shows */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() =>
              setOpenDropdown(openDropdown === "show" ? null : "show")
            }
            className={getDropdownButtonClass(
              activeShows.length > 0,
              openDropdown === "show"
            )}
          >
            <span className="truncate">
              Shows
              {activeShows.length > 0 && ` (${activeShows.length})`}
            </span>
            <ChevronDown
              size={14}
              className={`shrink-0 ml-1 transition-transform duration-200 ${
                openDropdown === "show" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openDropdown === "show" && (
            <div className="absolute left-0 top-full mt-1.5 w-full min-w-[240px] max-w-sm max-h-72 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 p-2 text-xs">
              <input
                type="text"
                placeholder="Search show..."
                value={searchShow}
                onChange={(e) => setSearchShow(e.target.value)}
                className="w-full mb-2 px-2.5 py-1.5 rounded border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableShows
                  .filter((sh) =>
                    sh.name.toLowerCase().includes(searchShow.toLowerCase())
                  )
                  .map((sh) => {
                    const checked = activeShows.includes(sh.name);
                    return (
                      <label
                        key={sh.id || sh.name}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleShow(sh.name)}
                          className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{sh.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown 3: Championships */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() =>
              setOpenDropdown(openDropdown === "champ" ? null : "champ")
            }
            className={getDropdownButtonClass(
              filterTitle || selectedChamps.length > 0,
              openDropdown === "champ"
            )}
          >
            <span className="truncate">
              Championships
              {filterTitle && selectedChamps.length === 0
                ? " (All)"
                : selectedChamps.length > 0
                ? ` (${selectedChamps.length})`
                : ""}
            </span>
            <ChevronDown
              size={14}
              className={`shrink-0 ml-1 transition-transform duration-200 ${
                openDropdown === "champ" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openDropdown === "champ" && (
            <div className="absolute left-0 top-full mt-1.5 w-full min-w-[240px] max-w-sm max-h-72 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 p-2 text-xs">
              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer font-bold border-b border-gray-200 dark:border-zinc-800 mb-1">
                <input
                  type="checkbox"
                  checked={filterTitle}
                  onChange={toggleTitle}
                  className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                <span>All Championship matches</span>
              </label>

              <input
                type="text"
                placeholder="Search championship..."
                value={searchChamp}
                onChange={(e) => setSearchChamp(e.target.value)}
                className="w-full my-1.5 px-2.5 py-1.5 rounded border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {championshipsList
                  .filter((c) =>
                    c.name.toLowerCase().includes(searchChamp.toLowerCase())
                  )
                  .map((c) => {
                    const checked = selectedChamps.includes(c.name);
                    return (
                      <label
                        key={c.id || c.name}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChamp(c.name)}
                          className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown 4: Stipulations */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() =>
              setOpenDropdown(openDropdown === "stip" ? null : "stip")
            }
            className={getDropdownButtonClass(
              filterStip || selectedStips.length > 0,
              openDropdown === "stip"
            )}
          >
            <span className="truncate">
              Stipulations
              {filterStip && selectedStips.length === 0
                ? " (All)"
                : selectedStips.length > 0
                ? ` (${selectedStips.length + (filterStip ? 1 : 0)})`
                : ""}
            </span>
            <ChevronDown
              size={14}
              className={`shrink-0 ml-1 transition-transform duration-200 ${
                openDropdown === "stip" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openDropdown === "stip" && (
            <div className="absolute left-0 top-full mt-1.5 w-full min-w-[240px] max-w-sm max-h-72 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 p-2 text-xs">
              <div className="border-b border-gray-200 dark:border-zinc-800 pb-1 mb-1 space-y-1">
                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={filterStip}
                    onChange={toggleStip}
                    className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>All Stipulation matches</span>
                </label>
                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={selectedStips.includes("Singles")}
                    onChange={() => toggleStipItem("Singles")}
                    className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Singles</span>
                </label>
              </div>

              <input
                type="text"
                placeholder="Search stipulation..."
                value={searchStip}
                onChange={(e) => setSearchStip(e.target.value)}
                className="w-full my-1.5 px-2.5 py-1.5 rounded border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {stipulationsList
                  .filter((s) => s.name.toLowerCase() !== "singles")
                  .filter((s) =>
                    s.name.toLowerCase().includes(searchStip.toLowerCase())
                  )
                  .map((s) => {
                    const checked = selectedStips.includes(s.name);
                    return (
                      <label
                        key={s.id || s.name}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStipItem(s.name)}
                          className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── FILA 2: Resultados (Wins, Draws, Losses) ocupando todo el ancho ─── */}
      <div className="grid grid-cols-3 gap-2 w-full">
        <button
          type="button"
          onClick={() => toggleResult("WIN")}
          className={getPillButtonClass(filterResults.includes("WIN"))}
        >
          Wins
        </button>
        <button
          type="button"
          onClick={() => toggleResult("DRAW")}
          className={getPillButtonClass(filterResults.includes("DRAW"))}
        >
          Draws
        </button>
        <button
          type="button"
          onClick={() => toggleResult("LOSS")}
          className={getPillButtonClass(filterResults.includes("LOSS"))}
        >
          Losses
        </button>
      </div>

      {/* ─── FILA 3: Formatos (1-on-1, 2-vs-2, 3-vs-3, Multi-man) ocupando todo el ancho ─── */}
      {hasFormatFilter && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
          <button
            type="button"
            onClick={() => toggleFormat("1v1")}
            className={getPillButtonClass(filterFormats.includes("1v1"))}
          >
            1-on-1
          </button>
          <button
            type="button"
            onClick={() => toggleFormat("2v2")}
            className={getPillButtonClass(filterFormats.includes("2v2"))}
          >
            2-vs-2
          </button>
          <button
            type="button"
            onClick={() => toggleFormat("3v3")}
            className={getPillButtonClass(filterFormats.includes("3v3"))}
          >
            3-vs-3
          </button>
          <button
            type="button"
            onClick={() => toggleFormat("multiman")}
            className={getPillButtonClass(filterFormats.includes("multiman"))}
          >
            Multi-man
          </button>
        </div>
      )}

      {/* ─── TAGS ACTIVOS Y BOTÓN RESET ─── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-200 dark:border-zinc-800">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mr-1">
            Active filters:
          </span>

          {filterTitle && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              Title Matches
              <button
                type="button"
                onClick={toggleTitle}
                className="hover:text-black dark:hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {filterStip && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              Stipulation Matches
              <button
                type="button"
                onClick={toggleStip}
                className="hover:text-black dark:hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {selectedWrestlers.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200"
            >
              {w}
              <button
                type="button"
                onClick={() => toggleWrestler(w)}
                className="hover:text-black dark:hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          ))}

          {activeShows.map((sh) => (
            <span
              key={sh}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200"
            >
              {sh}
              <button
                type="button"
                onClick={() => handleToggleShow(sh)}
                className="hover:text-black dark:hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          ))}

          {selectedChamps.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200"
            >
              {c}
              <button
                type="button"
                onClick={() => toggleChamp(c)}
                className="hover:text-black dark:hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          ))}

          {selectedStips.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200"
            >
              {s}
              <button
                type="button"
                onClick={() => toggleStipItem(s)}
                className="hover:text-black dark:hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          ))}

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <RotateCcw size={12} />
              Reset all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
