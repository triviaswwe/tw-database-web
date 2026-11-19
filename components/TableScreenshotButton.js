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
  const labelRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isCompact, setIsCompact] = useState(false);
  const isCompactRef = useRef(false);

  useEffect(() => {
    const checkFit = () => {
      const btn = buttonRef.current;
      const label = labelRef.current;
      if (!btn || !label) return;
      const headerEl = btn.closest(".justify-between") || btn.parentElement;
      if (!headerEl) return;

      const style = window.getComputedStyle(headerEl);
      const availableWidth =
        headerEl.clientWidth -
        (parseFloat(style.paddingLeft) || 0) -
        (parseFloat(style.paddingRight) || 0);
      const gap = parseFloat(style.columnGap || style.gap) || 8;
      const children = Array.from(headerEl.children);
      const fullSpans = Array.from(headerEl.querySelectorAll("[data-switch-full]"));
      const shortSpans = Array.from(headerEl.querySelectorAll("[data-switch-short]"));

      const prevDisplay = label.style.display;
      const prevFullDisplays = fullSpans.map((el) => el.style.display);
      const prevShortDisplays = shortSpans.map((el) => el.style.display);
      const prevWhiteSpaces = children.map((ch) => ch.style.whiteSpace);
      let requiredWidth = 0;

      try {
        label.style.display = "inline";
        fullSpans.forEach((el) => {
          el.style.display = "inline";
        });
        shortSpans.forEach((el) => {
          el.style.display = "none";
        });
        children.forEach((ch) => {
          ch.style.whiteSpace = "nowrap";
        });

        const childrenWidth = children.reduce(
          (sum, ch) =>
            sum + Math.max(ch.scrollWidth, ch.getBoundingClientRect().width),
          0
        );
        requiredWidth =
          childrenWidth +
          gap * Math.max(0, children.length - 1) +
          (isCompactRef.current ? 4 : 0) +
          4;
      } finally {
        children.forEach((ch, idx) => {
          ch.style.whiteSpace = prevWhiteSpaces[idx];
        });
        fullSpans.forEach((el, idx) => {
          el.style.display = prevFullDisplays[idx];
        });
        shortSpans.forEach((el, idx) => {
          el.style.display = prevShortDisplays[idx];
        });
        label.style.display = prevDisplay;
      }

      const nextCompact = requiredWidth > availableWidth;
      if (nextCompact !== isCompactRef.current) {
        isCompactRef.current = nextCompact;
        setIsCompact(nextCompact);
      }
    };

    checkFit();

    const btn = buttonRef.current;
    const headerEl = btn?.closest(".justify-between") || btn?.parentElement;
    let observer = null;
    if (headerEl && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(checkFit);
      observer.observe(headerEl);
    }
    window.addEventListener("resize", checkFit);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", checkFit);
    };
  }, [title]);

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
      const { toSvg } = await import("html-to-image");
      const isDarkMode =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");
      const isMobile =
        typeof window !== "undefined" &&
        (window.innerWidth < 640 ||
          (navigator.maxTouchPoints > 0 &&
            /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)));

      const hasCardBorder =
        target.classList.contains("border") &&
        target.classList.contains("overflow-hidden");

      const liveTableEl = target.querySelector("table");
      const origWidth = target.offsetWidth;
      const liveTableWidth = liveTableEl
        ? Math.max(liveTableEl.scrollWidth, liveTableEl.offsetWidth)
        : target.scrollWidth;
      const padAndBorder = hasCardBorder ? 2 : 32;

      let finalWidth = Math.ceil(Math.max(origWidth, liveTableWidth + padAndBorder) + 4);

      offscreen = document.createElement("div");
      offscreen.style.cssText = `position:fixed;left:-100000px;top:0;width:${finalWidth}px;height:auto;overflow:visible;pointer-events:none;z-index:-9999;-webkit-text-size-adjust:100%;text-size-adjust:100%;`;

      const clone = target.cloneNode(true);
      clone.setAttribute("data-capturing", "true");
      clone.querySelectorAll(".no-screenshot").forEach((el) => el.remove());

      if (!hasCardBorder) {
        clone.style.padding = "16px";
      }
      clone.style.width = `${finalWidth}px`;
      clone.style.minWidth = `${finalWidth}px`;
      clone.style.maxWidth = `${finalWidth}px`;
      clone.style.inlineSize = `${finalWidth}px`;
      clone.style.height = "auto";

      offscreen.appendChild(clone);
      document.body.appendChild(offscreen);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const imgs = Array.from(clone.querySelectorAll("img"));
      await Promise.all(
        imgs.map(async (img) => {
          if (img.loading === "lazy") img.loading = "eager";
          if (!img.complete || img.naturalWidth === 0) {
            await new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            });
          }
          if (img.decode) {
            await img.decode().catch(() => {});
          }
        })
      );

      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );

      const cloneTableEl = clone.querySelector("table");
      for (let pass = 0; pass < 2 && cloneTableEl; pass++) {
        const tableWidth = Math.ceil(
          Math.max(
            cloneTableEl.scrollWidth,
            cloneTableEl.offsetWidth,
            cloneTableEl.getBoundingClientRect().width
          )
        );
        if (tableWidth + padAndBorder > finalWidth) {
          finalWidth = tableWidth + padAndBorder + 4;
          offscreen.style.width = `${finalWidth}px`;
          clone.style.width = `${finalWidth}px`;
          clone.style.minWidth = `${finalWidth}px`;
          clone.style.maxWidth = `${finalWidth}px`;
          clone.style.inlineSize = `${finalWidth}px`;
        } else {
          break;
        }
      }

      clone.querySelectorAll("tr").forEach((tr) => {
        const h = tr.getBoundingClientRect().height;
        if (h > 0) {
          tr.style.height = `${Math.ceil(h)}px`;
        }
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const cloneRect = clone.getBoundingClientRect();
      const lastChild = clone.lastElementChild;
      const lastChildBottom = lastChild
        ? lastChild.getBoundingClientRect().bottom -
          cloneRect.top +
          (hasCardBorder ? 2 : 16)
        : 0;

      const finalHeight =
        Math.ceil(
          Math.max(
            cloneRect.height,
            clone.scrollHeight,
            clone.offsetHeight,
            lastChildBottom
          )
        ) + 6;

      const bgColor = isDarkMode ? "#09090b" : "#ffffff";

      const rawSvgDataUrl = await toSvg(clone, {
        backgroundColor: bgColor,
        width: finalWidth,
        height: finalHeight,
        cacheBust: false,
        includeQueryParams: true,
        filter: (node) => !node?.classList?.contains("no-screenshot"),
        style: {
          width: `${finalWidth}px`,
          inlineSize: `${finalWidth}px`,
          height: "auto",
          blockSize: "auto",
          margin: "0",
        },
      });
      if (!rawSvgDataUrl) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const maxTextureDim = isMobile ? 4096 : 8192;
      const maxCanvasArea = isMobile ? 4096 * 4096 : 8192 * 8192;
      const baseRatio = isMobile ? Math.min(3, Math.max(2, dpr)) : 2;
      const dimScale = maxTextureDim / Math.max(finalWidth, finalHeight, 1);
      const areaScale = Math.sqrt(
        maxCanvasArea / Math.max(finalWidth * finalHeight, 1)
      );
      const safeScale = Math.min(baseRatio, dimScale, areaScale);

      const canvasWidth = Math.max(
        1,
        Math.min(maxTextureDim, Math.floor(finalWidth * safeScale))
      );
      const canvasHeight = Math.max(
        1,
        Math.min(maxTextureDim, Math.floor(finalHeight * safeScale))
      );

      // Escala el SVG en unidades CSS por 1/dpr para que el rasterizador nativo del móvil nunca exceda maxTextureDim
      let svgDataUrl = rawSvgDataUrl;
      const utf8Prefix = "data:image/svg+xml;charset=utf-8,";
      if (rawSvgDataUrl.startsWith(utf8Prefix)) {
        const svgText = decodeURIComponent(rawSvgDataUrl.slice(utf8Prefix.length));
        const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const svgEl = doc.documentElement;
        if (svgEl && svgEl.tagName.toLowerCase() === "svg") {
          svgEl.setAttribute("width", String(canvasWidth / dpr));
          svgEl.setAttribute("height", String(canvasHeight / dpr));
          svgEl.setAttribute("viewBox", `0 0 ${finalWidth} ${finalHeight}`);
          const fo = svgEl.querySelector("foreignObject");
          if (fo) {
            fo.setAttribute("width", String(finalWidth));
            fo.setAttribute("height", String(finalHeight));
          }
          const serialized = new XMLSerializer().serializeToString(svgEl);
          svgDataUrl = `${utf8Prefix}${encodeURIComponent(serialized)}`;
        }
      }

      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          if (image.decode) {
            image
              .decode()
              .then(() => resolve(image))
              .catch(() => resolve(image));
          } else {
            resolve(image);
          }
        };
        image.onerror = reject;
        image.crossOrigin = "anonymous";
        image.src = svgDataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/png");
      if (!dataUrl) return;

      const safeSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const finalFileName = fileName || `tw_${safeSlug || "table"}.png`;

      setPreviewData({
        url: dataUrl,
        fileName: finalFileName,
        width: finalWidth,
        height: finalHeight,
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
        className={`no-screenshot px-2.5 py-1 ${isCompact ? "sm:px-2.5" : "sm:px-3"} sm:py-1.5 rounded font-medium text-xs bg-gray-200 text-gray-800 dark:bg-zinc-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 select-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0 ${className}`}
      >
        <Camera
          size={14}
          className={`shrink-0 ${isCapturing ? "animate-pulse" : ""}`}
        />
        <span
          ref={labelRef}
          data-screenshot-label="true"
          className={isCompact ? "hidden" : "hidden sm:inline"}
        >
          Screenshot
        </span>
      </button>

      {previewData && (
        <div
          onClick={closePreview}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overscroll-contain text-left font-normal"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden overscroll-contain"
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

            <div className="overflow-auto flex-1 bg-gray-100 dark:bg-zinc-950 overscroll-contain">
              <div className="min-w-full min-h-full w-max flex items-center justify-center p-3 sm:p-4">
                <img
                  src={previewData.url}
                  alt="Screenshot preview"
                  style={{
                    width: previewData.width ? `${previewData.width}px` : undefined,
                    maxWidth: "none",
                  }}
                  className="h-auto block rounded shadow"
                />
              </div>
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
