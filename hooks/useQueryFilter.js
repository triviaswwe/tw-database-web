// hooks/useQueryFilter.js
//
// Hooks de alto nivel para filtros, toggles y paginación con Next.js router.
// Usa useDebounce internamente.

import { useState, useEffect } from "react";
import { useDebounce } from "./useDebounce";

/**
 * Mantiene el estado local de un input de texto y lo sincroniza
 * con un query param de la URL tras 500ms de inactividad.
 *
 * @param {string} paramKey    - Nombre del query param (ej. "filter", "wrestler")
 * @param {string} serverValue - Valor actual del param que vino del servidor (prop)
 * @param {object} router      - useRouter() del componente
 * @param {number} [delay=500] - Milisegundos de debounce
 * @returns {{ input: string, setInput: Function }}
 */
export function useQueryFilter(paramKey, serverValue, router, delay = 500) {
  const [input, setInput] = useState(serverValue || "");
  const debounced = useDebounce(input, delay);

  // Cuando el valor debounced cambia y es distinto al del servidor → router.push
  useEffect(() => {
    const trimmed = debounced.trim();
    if (trimmed === (serverValue || "")) return;
    const q = { ...router.query, page: 1 };
    if (trimmed) q[paramKey] = trimmed;
    else delete q[paramKey];
    router.push({ pathname: router.pathname, query: q }, undefined, {
      scroll: false,
    });
  }, [debounced]);

  // Sincronizar input si el usuario navega con back/forward
  useEffect(() => {
    setInput(serverValue || "");
  }, [serverValue]);

  return { input, setInput };
}

/**
 * Toggle para filtros booleanos (?paramKey=1).
 *
 * @param {string}  paramKey - Nombre del query param (ej. "title", "stip")
 * @param {boolean} isActive - Estado actual del filtro
 * @param {object}  router   - useRouter()
 * @returns {Function}       - toggleFn para llamar en onClick
 */
export function useQueryToggle(paramKey, isActive, router) {
  return () => {
    const q = { ...router.query, page: 1 };
    if (isActive) delete q[paramKey];
    else q[paramKey] = "1";
    router.push({ pathname: router.pathname, query: q }, undefined, {
      scroll: false,
    });
  };
}

/**
 * Paginación estilo Events (ventana deslizante de 3 botones).
 *
 * @param {{ page: number, totalPages: number }} pagination
 * @param {object} router - useRouter()
 * @returns {{ goToPage: Function, renderPageButtons: Function }}
 */
export function usePagination(pagination, router) {
  const goToPage = (p) => {
    router.push(
      { pathname: router.pathname, query: { ...router.query, page: p } },
      undefined,
      { scroll: false },
    );
  };

  const renderPageButtons = () => {
    const { page, totalPages } = pagination;
    let start = Math.max(1, page - 1);
    let end   = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    const buttons = [];
    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-1 rounded ${
            page === i
              ? "bg-blue-600 text-white shadow"
              : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
          }`}
        >
          {i}
        </button>,
      );
    }
    return buttons;
  };

  return { goToPage, renderPageButtons };
}