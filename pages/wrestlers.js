// pages/wrestlers.js

import Head from "next/head";
import { useState, useEffect } from "react";
import Link from "next/link";
import Spinner from "../components/Spinner";
import FlagWithName from "../components/FlagWithName";

const WRESTLERS_PER_PAGE = 33;

// Dominio base de Vercel Blob
const BLOB_BASE_URL = 'https://ljejfdquofuxccca.public.blob.vercel-storage.com';

// Pestañas principales
const mainTabOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

// Chips secundarios, solo visibles dentro de la pestaña "Active".
// Los valores son el brand EXACTO tal cual está en la DB.
const activeBrandOptions = [
  { label: "All brands", value: "" },
  { label: "RAW", value: "RAW" },
  { label: "SmackDown", value: "SmackDown" },
  { label: "NXT", value: "NXT" },
];

// Fondos de brand actualizados con las rutas absolutas de Vercel Blob
const BRAND_BACKGROUNDS = {
  RAW: `${BLOB_BASE_URL}/brands/wrestlers_bg_raw.png`,
  SmackDown: `${BLOB_BASE_URL}/brands/wrestlers_bg_smackdown.png`,
  NXT: `${BLOB_BASE_URL}/brands/wrestlers_bg_nxt.png`,
  Alumni: `${BLOB_BASE_URL}/brands/wrestlers_bg_alumni.png`,
};

export default function WrestlersPage() {
  const [wrestlers, setWrestlers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // "all" | "active" | "inactive"
  const [mainTab, setMainTab] = useState("active");
  // solo aplica cuando mainTab === "active": "" (All brands) | "RAW" | "SmackDown" | "NXT"
  const [brandFilter, setBrandFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  useEffect(() => {
    async function fetchWrestlers() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", WRESTLERS_PER_PAGE);
        if (nameFilter) params.append("filter", nameFilter);

        if (mainTab === "inactive") {
          params.append("group", "inactive");
        } else if (mainTab === "active") {
          if (brandFilter) {
            params.append("brand", brandFilter);
          } else {
            params.append("group", "active");
          }
        }
        // mainTab === "all": no se manda ni group ni brand -> trae todos

        const res = await fetch(`/api/wrestlers?${params.toString()}`);
        const data = await res.json();
        setWrestlers(data.wrestlers || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error(err);
        setWrestlers([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }
    fetchWrestlers();
  }, [page, mainTab, brandFilter, nameFilter]);

  const selectMainTab = (tab) => {
    setMainTab(tab);
    setBrandFilter("");
    setPage(1);
  };

  const selectBrandFilter = (value) => {
    setBrandFilter(value);
    setPage(1);
  };

  const renderPageButtons = () => {
    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    const buttons = [];
    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`px-3 py-1 rounded ${page === i ? "bg-blue-600 text-white shadow" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"}`}
        >
          {i}
        </button>,
      );
    }
    return buttons;
  };

  return (
    <>
      <Head>
        <title>Wrestlers — Trivias WWE</title>
        <meta
          name="description"
          content="Listado completo de wrestlers del Campeonato de Trivias WWE. Filtrá por brand y nombre."
        />
      </Head>

      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Wrestlers</h1>

        {/* Pestañas principales */}
        <div className="mb-3 flex gap-2 border-b border-gray-300 dark:border-gray-700">
          {mainTabOptions.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => selectMainTab(value)}
              className={`px-4 py-2 font-semibold border-b-2 -mb-px transition-colors ${
                mainTab === value
                  ? "border-blue-600 text-blue-600 dark:text-sky-300 dark:border-sky-300"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Chips de brand, solo dentro de Active */}
        {mainTab === "active" && (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeBrandOptions.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => selectBrandFilter(value)}
                className={`px-4 py-2 rounded font-semibold ${brandFilter === value ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <input
          type="text"
          placeholder="Filter by wrestler name"
          value={nameFilter}
          onChange={(e) => {
            setNameFilter(e.target.value);
            setPage(1);
          }}
          className="mb-6 w-full md:w-1/2 dark:bg-zinc-950 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-600"
        />

        {loading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {wrestlers.length === 0 ? (
              <p>No wrestlers found.</p>
            ) : (
              wrestlers.map((w) => {
                const brandBg = BRAND_BACKGROUNDS[w.brand] ?? null;

                return (
                  <Link key={w.id} href={`/wrestlers/${w.id}`}>
                    <div className="relative overflow-hidden flex items-center p-4 min-h-[6rem] border rounded shadow hover:shadow-lg transform transition-transform duration-200 ease-in-out hover:scale-105 cursor-pointer">
                      {/* Fondo de brand */}
                      {brandBg && (
                        <img
                          src={brandBg}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}

                      {/* Overlay para que el texto/imagen sigan legibles */}
                      <div className="absolute inset-0 bg-black/40" />

                      {/* Contenedor de la imagen */}
                      {w.image_url && (
                        <div className="absolute bottom-0 left-4 w-16 md:w-[80px]">
                          <img
                            src={w.image_url}
                            alt={w.wrestler}
                            className="w-full h-auto object-bottom"
                          />
                        </div>
                      )}

                      {/* Margen izquierdo del texto */}
                      <div
                        className={`relative flex-1 ${w.image_url ? "ml-20 md:ml-24" : ""}`}
                      >
                        <div className="flex items-center">
                          <FlagWithName code={w.country} />
                          <h2 className="text-xl font-bold text-white">
                            {w.wrestler}
                          </h2>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}

        <div className="mt-8 flex justify-center space-x-2 items-center">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className={`px-3 py-1 rounded transition-colors ${page === 1 ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}
          >
            &#171;
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded transition-colors ${page === 1 ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}
          >
            &lt;
          </button>
          {renderPageButtons()}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-3 py-1 rounded transition-colors ${page === totalPages ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}
          >
            &gt;
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className={`px-3 py-1 rounded transition-colors ${page === totalPages ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}
          >
            &#187;
          </button>
        </div>
      </div>
    </>
  );
}