// components/ChampionsSection.js
import Image from "next/image";
import Link from "next/link";

function getChampionLabel(title, isTagTeam) {
  return title.replace(/Championship/i, isTagTeam ? "Champions" : "Champion");
}

// Altura FIJA e IGUAL para todas las tarjetas (individuales y tag team),
// responsive por breakpoint pero nunca calculada a partir del ancho.
const CARD_HEIGHT = "h-[220px] sm:h-[260px] md:h-[300px] lg:h-[340px]";

export default function ChampionsSection({ champions }) {
  if (!champions || champions.length === 0) return null;

  return (
    <section className="mb-14">
      <h2 className="text-2xl font-bold mb-8 text-center tracking-wide uppercase">
        Campeones Actuales
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {champions.map((c) => {
          const label = getChampionLabel(c.championship, c.isTagTeam);
          const hasTeamName = c.isTagTeam && !!c.tagTeamName;

          return (
            <div
              key={c.championshipId}
              className={`${
                c.isTagTeam ? "col-span-2" : "col-span-1"
              } rounded-lg shadow-lg shadow-black/30 dark:shadow-black/60 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl`}
            >
              <div
                className={`relative w-full ${CARD_HEIGHT} rounded-lg overflow-hidden bg-zinc-900`}
              >
                {c.isTagTeam ? (
                  <div className="relative z-0 grid grid-cols-2 h-full">
                    {c.wrestlers.slice(0, 2).map((w, i) => (
                      <div key={w.id} className="relative h-full">
                        {w.background && (
                          <Image
                            src={w.background}
                            alt=""
                            fill
                            className="object-cover z-0"
                            sizes="(max-width: 768px) 25vw, 12vw"
                          />
                        )}
                        <Image
                          src={c.images[i]}
                          alt={w.name}
                          fill
                          className="object-cover z-10"
                          sizes="(max-width: 768px) 25vw, 12vw"
                        />
                        {c.plate && (
                          <Image
                            src={c.plate}
                            alt=""
                            fill
                            className="object-cover z-20 pointer-events-none"
                            sizes="(max-width: 768px) 25vw, 12vw"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {c.wrestlers[0]?.background && (
                      <Image
                        src={c.wrestlers[0].background}
                        alt=""
                        fill
                        className="object-cover z-0"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    )}
                    <Image
                      src={c.images[0]}
                      alt={c.wrestlers[0]?.name}
                      fill
                      className="object-cover z-10 transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    {c.plate && (
                      <Image
                        src={c.plate}
                        alt=""
                        fill
                        className="object-cover z-20 pointer-events-none"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    )}
                  </>
                )}

                <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 to-transparent p-3">
                  <p className="text-[11px] uppercase tracking-wider text-white font-semibold">
                    {label}
                  </p>

                  {hasTeamName && (
                    <Link
                      href={`/stables/${c.tagTeamId}`}
                      className="block text-white font-bold leading-tight"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.tagTeamName}
                    </Link>
                  )}

                  <p
                    className={
                      hasTeamName
                        ? "text-white text-sm font-medium leading-tight"
                        : "text-white font-bold leading-tight"
                    }
                  >
                    {c.wrestlers.map((w, i) => (
                      <span key={w.id}>
                        <Link
                          href={`/wrestlers/${w.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {w.name}
                        </Link>
                        {i < c.wrestlers.length - 1 && " & "}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}