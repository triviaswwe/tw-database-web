// components/TableScreenshotButton.js
import React, { useState, useRef, useEffect } from "react";
import { Camera, Download, X } from "lucide-react";

export default function TableScreenshotButton({
  title = "table",
  fileName,
  targetRef,
  className = "",
}) {
  const buttonRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    if (!previewData) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [previewData]);

  const handleTakeScreenshot = async () => {
    if (isCapturing) return;
    const target =
      targetRef?.current ||
      buttonRef.current?.closest("[data-screenshot-target]") ||
      buttonRef.current?.parentElement?.parentElement;

    if (!target) return;

    setIsCapturing(true);
    let offscreen = null;

    try {
      const { toPng } = await import("html-to-image");
      const isDarkMode =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");
      const isMobile =
        typeof window !== "undefined" && window.innerWidth < 640;

      const hasCardBorder =
        target.classList.contains("border") &&
        target.classList.contains("overflow-hidden");

      const liveTableEl = target.querySelector("table");
      const origWidth = target.offsetWidth;
      const liveTableWidth = liveTableEl
        ? Math.max(liveTableEl.scrollWidth, liveTableEl.offsetWidth)
        : target.scrollWidth;

      const padAndBorder = hasCardBorder ? 2 : 32;
      let totalWidth = Math.ceil(Math.max(origWidth, liveTableWidth + padAndBorder) + 4);

      // Clonamos fuera de pantalla con el ancho ya fijado para que position:fixed no estire la tabla a max-content
      offscreen = document.createElement("div");
      offscreen.style.cssText = `position:fixed;left:-100000px;top:0;width:${totalWidth}px;pointer-events:none;z-index:-9999;`;
      const clone = target.cloneNode(true);
      clone.setAttribute("data-capturing", "true");
      if (!hasCardBorder) {
        clone.style.padding = "16px";
      }
      clone.style.width = `${totalWidth}px`;
      clone.style.minWidth = `${totalWidth}px`;
      clone.style.maxWidth = `${totalWidth}px`;
      clone.style.inlineSize = `${totalWidth}px`;

      offscreen.appendChild(clone);
      document.body.appendChild(offscreen);

      const imgs = Array.from(clone.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) => {
          if (img.loading === "lazy") img.loading = "eager";
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })
      );

      // En mobile, las reglas de captura (como nowrap en celdas) pueden ensanchar la tabla clonada respecto al DOM vivo
      const cloneTableEl = clone.querySelector("table");
      for (let pass = 0; pass < 2 && cloneTableEl; pass++) {
        const cloneTableWidth = Math.ceil(
          Math.max(
            cloneTableEl.scrollWidth,
            cloneTableEl.offsetWidth,
            cloneTableEl.getBoundingClientRect().width
          )
        );
        if (cloneTableWidth + padAndBorder > totalWidth) {
          totalWidth = cloneTableWidth + padAndBorder + 4;
          offscreen.style.width = `${totalWidth}px`;
          clone.style.width = `${totalWidth}px`;
          clone.style.minWidth = `${totalWidth}px`;
          clone.style.maxWidth = `${totalWidth}px`;
          clone.style.inlineSize = `${totalWidth}px`;
        } else {
          break;
        }
      }

      const rect = clone.getBoundingClientRect();
      const finalWidth = totalWidth;
      const finalHeight = Math.ceil(
        Math.max(rect.height, clone.scrollHeight, clone.offsetHeight)
      );

      // Evita que tablas muy largas superen el límite de textura del canvas (8192px) y salgan cortadas abajo
      const baseRatio = isMobile ? 3 : 2;
      const maxDim = Math.max(finalWidth, finalHeight, 1);
      const safePixelRatio = Math.max(
        1,
        Math.min(baseRatio, Math.floor((8192 / maxDim) * 100) / 100)
      );

      const dataUrl = await toPng(clone, {
        backgroundColor: isDarkMode ? "#09090b" : "#ffffff",
        pixelRatio: safePixelRatio,
        width: finalWidth,
        height: finalHeight,
        cacheBust: false,
        includeQueryParams: true,
        filter: (node) => !node?.classList?.contains("no-screenshot"),
        style: {
          width: `${finalWidth}px`,
          inlineSize: `${finalWidth}px`,
          height: `${finalHeight}px`,
          blockSize: `${finalHeight}px`,
          margin: "0",
        },
      });
      if (!dataUrl) return;

      const safeSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const finalFileName = fileName || `tw_${safeSlug || "table"}.png`;

      setPreviewData({
        url: dataUrl,
        fileName: finalFileName,
      });
    } catch (err) {
      console.error("Error taking table screenshot:", err);
    } finally {
      if (offscreen && offscreen.parentNode) {
        offscreen.parentNode.removeChild(offscreen);
      }
      setIsCapturing(false);
    }
  };

  const closePreview = () => setPreviewData(null);

  const handleConfirmDownload = () => {
    if (!previewData) return;
    const link = document.createElement("a");
    link.download = previewData.fileName;
    link.href = previewData.url;
    link.click();
    closePreview();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleTakeScreenshot}
        disabled={isCapturing}
        title="Descargar screenshot de la tabla"
        aria-label="Screenshot"
        className={`no-screenshot px-2.5 py-1 sm:px-3 sm:py-1.5 rounded font-medium text-xs bg-gray-200 text-gray-800 dark:bg-zinc-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 select-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0 ${className}`}
      >
        <Camera
          size={14}
          className={`shrink-0 ${isCapturing ? "animate-pulse" : ""}`}
        />
        <span className="hidden sm:inline">Screenshot</span>
      </button>

      {previewData && (
        <div
          onClick={closePreview}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overscroll-contain text-left font-normal"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden overscroll-contain"
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-800 dark:text-white truncate">
                {previewData.fileName}
              </span>
              <button
                type="button"
                onClick={closePreview}
                aria-label="Close preview"
                className="p-1 rounded text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-gray-100 dark:bg-zinc-950 overscroll-contain">
              <img
                src={previewData.url}
                alt="Screenshot preview"
                className="max-h-[65vh] w-auto object-contain rounded shadow"
              />
            </div>

            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closePreview}
                className="px-4 py-2 rounded font-semibold text-sm bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDownload}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded font-semibold text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 shadow whitespace-nowrap"
              >
                <Download size={15} />
                <span>Confirm download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
