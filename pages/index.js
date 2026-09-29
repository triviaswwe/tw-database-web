// pages/index.js

import Head from "next/head";
import Script from "next/script";
import ChampionsSection from "../components/ChampionsSection";
import { getCurrentChampions } from "../lib/champions";


export default function Home({ champions, isDark }) {
  // Ya no necesitamos el useEffect del embed.js porque usaremos iframes directos

  return (
    <div className="py-6 px-4 max-w-5xl mx-auto overflow-hidden">
      <Head>
        <title>Trivias WWE</title>
        <meta
          name="description"
          content="Participá del Campeonato de Trivias de WWE y demostrale al mundo cuánto sabés de lucha libre"
        />
      </Head>

      <h1 className="text-4xl font-bold mb-6 text-center">
        Bienvenido a Trivias WWE
      </h1>

      <p className="text-lg mb-10 max-w-3xl mx-auto text-center">
        Esta es la página oficial del <strong>Campeonato de Trivias de WWE</strong>,
        un torneo competitivo donde fanáticos de la lucha libre responden
        preguntas sobre luchadores, eventos históricos, títulos, movimientos y
        mucho más. Representá a tu luchador favorito en RAW, SmackDown o NXT y
        acumulá victorias para llegar a lo más alto del ranking.
      </p>

      <ChampionsSection champions={champions} />

      {/* ── Sección Instagram ─────────────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold mb-6 text-center">
        Últimas publicaciones en Instagram
      </h2>

      {/*
        Solución Definitiva y Profesional:
        Para tener AUTOMATIZACIÓN (últimos 9 posts) + DARK MODE sin romper la UI, 
        la industria utiliza widgets especializados, ya que Meta/Instagram bloquea 
        ambas cosas en su código oficial.

        Instrucciones:
        1. Crea una cuenta gratuita en https://elfsight.com/es/instagram-feed-instashow/
        2. Configura tu widget con tu usuario "@triviaswwe"
        3. Configura el diseño en "Grid" (Cuadrícula) de 3x3 (9 posts).
        4. Configura el color a Dark Mode.
        5. Copia el ID del widget que te dan y reemplázalo abajo donde dice "TU_ID_DE_ELFSIGHT".
      */}
      <div className="flex justify-center mb-10 w-full">
        <Script
          src="https://static.elfsight.com/platform/platform.js"
          strategy="lazyOnload"
        />
        <div
          className="elfsight-app-4e326772-6b71-4b56-ba86-7ad04e59735e w-full max-w-4xl"
          data-elfsight-app-lazy
          style={{ "--ig-text": isDark ? "#ffffff" : "#000000" }}
        />
      </div>

    </div>
  );
}

export async function getStaticProps() {
  const champions = await getCurrentChampions();
  return {
    props: { champions },
    revalidate: 300,
  };
}