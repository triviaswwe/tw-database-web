// components/ChampionsSection.js
import Image from "next/image";
import Link from "next/link";

function getChampionLabel(title, isTagTeam) {
  return title.replace(/Championship/i, isTagTeam ? "Champions" : "Champion");
}

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
                className={`relative w-full ${
                  c.isTagTeam ? "aspect-[3/2]" : "aspect-[3/4]"
                } rounded-lg overflow-hidden bg-zinc-900`}
              >
                {c.isTagTeam ? (
                  <div className="grid grid-cols-2 h-full">
                    {c.wrestlers.slice(0, 2).map((w, i) => (
                      <div key={w.id} className="relative h-full">
                        {/* Fondo de brand, detrás del luchador */}
                        {w.background && (
                          <Image
                            src={w.background}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 25vw, 12vw"
                          />
                        )}
                        <Image
                          src={c.images[i]}
                          alt={w.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 25vw, 12vw"
                        />
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
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    )}
                    <Image
                      src={c.images[0]}
                      alt={c.wrestlers[0]?.name}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
                  <p className="text-[11px] uppercase tracking-wider text-white font-semibold">
                    {label}
                  </p>

                  {hasTeamName && (
                    <Link
                      href={`/stables/${c.tagTeamId}`}
                      className="block text-white font-bold leading-tight hover:underline"
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
                          className="hover:underline"
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