// hooks/useQueryFilter.js

import { useState, useEffect } from "react";
import { useDebounce } from "./useDebounce";

/**
 * Mantiene el estado local de un input de texto y lo sincroniza
 * con un query param de la URL tras el delay de debounce.
 */
export function useQueryFilter(paramKey, serverValue, router, delay = 500) {
  const [input, setInput] = useState(serverValue || "");
  const debounced = useDebounce(input, delay);

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

  useEffect(() => {
    setInput(serverValue || "");
  }, [serverValue]);

  return { input, setInput };
}

/**
 * Toggle para filtros booleanos (?paramKey=1).
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
 * Paginación con ventana deslizante de 3 botones
 * + botones de primera y última página (|< y >|).
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

    // Clases compartidas
    const base   = "px-3 py-1 rounded transition-colors";
    const active = "bg-blue-600 text-white shadow";
    const normal = "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700";
    const disabled = "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50";

    // Ventana deslizante de 3 botones numéricos
    let start = Math.max(1, page - 1);
    let end   = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);

    const numberButtons = [];
    for (let i = start; i <= end; i++) {
      numberButtons.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`${base} ${page === i ? active : normal}`}
        >
          {i}
        </button>,
      );
    }

    return (
      <>
        {/* |< Primera página */}
        <button
          onClick={() => goToPage(1)}
          disabled={page === 1}
          className={`${base} ${page === 1 ? disabled : normal}`}
          title="First page"
        >
          &#171;
        </button>

        {/* < Página anterior */}
        <button
          onClick={() => goToPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`${base} ${page === 1 ? disabled : normal}`}
        >
          &lt;
        </button>

        {/* Números */}
        {numberButtons}

        {/* > Página siguiente */}
        <button
          onClick={() => goToPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={`${base} ${page === totalPages ? disabled : normal}`}
        >
          &gt;
        </button>

        {/* >| Última página */}
        <button
          onClick={() => goToPage(totalPages)}
          disabled={page === totalPages}
          className={`${base} ${page === totalPages ? disabled : normal}`}
          title="Last page"
        >
          &#187;
        </button>
      </>
    );
  };

  return { goToPage, renderPageButtons };
}