// hooks/useDebounce.js
//
// Hook primitivo de debounce. Devuelve el valor retrasado N milisegundos.
//
// Uso básico:
//   const debouncedValue = useDebounce(inputValue, 500);
//
// useQueryFilter (hooks/useQueryFilter.js) lo usa internamente,
// pero también puede usarse standalone para cualquier otro caso.

import { useState, useEffect } from "react";

/**
 * @param {any}    value  - Valor a debouncear (string, number, object, etc.)
 * @param {number} delay  - Milisegundos de espera (default: 500)
 * @returns {any}         - El valor estabilizado tras el delay
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debouncedValue;
}