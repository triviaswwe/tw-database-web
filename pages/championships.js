// pages/championships.js

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import FlagWithName from "../components/FlagWithName";

const fetcher = (url) => fetch(url).then((r) => r.json());

const CHAMPIONS = [
  { id: 1, title: "Undisputed WWE Championship" },
  { id: 2, title: "World Heavyweight Championship" },
  { id: 3, title: "Intercontinental Championship" },
  { id: 4, title: "United States Championship" },
  { id: 5, title: "WWE World Tag Team Championship" },
  { id: 6, title: "NXT Championship" },
  { id: 7, title: "Speed Championship" },
];

export default function ChampionshipsPage() {
  const [sel, setSel] = useState(null);

  const { data: champ } = useSWR(
    sel ? `/api/championships/${sel}` : null,
    fetcher
  );
  const { data: reigns } = useSWR(
    sel ? `/api/championships/${sel}/reigns` : null,
    fetcher
  );

  // Helper para calcular días entre dos fechas (loss si existe, sino hoy)
  const calculateDaysHeld = (wonDateStr, lostDateStr) => {
    const start = new Date(wonDateStr);
    const end = lostDateStr ? new Date(lostDateStr) : new Date();
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return lostDateStr ? diffDays : `${diffDays}+`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Championships</h1>
      <p className="mb-4 text-lg font-medium">
        Select a championship to view its stats:
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        {CHAMPIONS.map((c) => (
          <button
            key={c.id}
            onClick={() => setSel(c.id)}
            className={`px-4 py-2 rounded shadow ${
              sel === c.id
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {sel && (
        <div className="space-y-4">
          {!champ || !reigns ? (
            <p>Loading...</p>
          ) : (
            <>
              <h2 className="text-2xl font-semibold">{champ.title_name}</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Established:{" "}
                {new Date(champ.date_established).toLocaleDateString(
                  undefined,
                  { timeZone: "UTC" }
                )}
              </p>

              {/* Contenedor para permitir scroll horizontal en móvil */}
              <div className="overflow-x-auto">
                <table className="table-auto w-full border-collapse text-sm min-w-[800px]">
                  {/* min-w define un ancho mínimo para que no colapse demasiado en móvil */}
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="border px-2 py-1 whitespace-nowrap">#</th>
                      <th className="border px-2 py-1 whitespace-nowrap">Wrestler</th>
                      <th className="border px-2 py-1 whitespace-nowrap">Interpreter</th>
                      <th className="border px-2 py-1 whitespace-nowrap">Won Date</th>
                      <th className="border px-2 py-1 whitespace-nowrap">Event</th>
                      <th className="border px-2 py-1 whitespace-nowrap">Reign #</th>
                      <th className="border px-2 py-1 whitespace-nowrap">Days Held</th>
                      <th className="border px-2 py-1 whitespace-nowrap">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reigns.map((r, idx) => {
                      const daysHeld = calculateDaysHeld(r.won_date, r.lost_date);
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="border px-2 py-1 text-center whitespace-nowrap">
                            {idx + 1}
                          </td>

                          <td className="border px-2 py-1 whitespace-nowrap">
                            {r.wrestler_id ? (
                              <Link
                                href={`/wrestlers/${r.wrestler_id}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <FlagWithName code={r.country} name={r.wrestler} />
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="border px-2 py-1 whitespace-nowrap">
                            {r.interpreter_id ? (
                              <Link
                                href={`/interpreters/${r.interpreter_id}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <FlagWithName
                                  code={r.nationality}
                                  name={r.interpreter}
                                />
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="border px-2 py-1 text-center whitespace-nowrap">
                            {new Date(r.won_date).toLocaleDateString(undefined, {
                              timeZone: "UTC",
                            })}
                          </td>

                          <td className="border px-2 py-1 whitespace-nowrap">
                            {r.event_id ? (
                              <Link
                                href={`/events/${r.event_id}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {r.event_name}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="border px-2 py-1 text-center whitespace-nowrap">
                            {r.reign_number}
                          </td>

                          <td className="border px-2 py-1 text-center whitespace-nowrap">
                            {daysHeld}
                          </td>

                          <td className="border px-2 py-1 text-center whitespace-nowrap">
                            {r.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Fin del contenedor scroll */}
            </>
          )}
        </div>
      )}
    </div>
  );
}
