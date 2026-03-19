// pages/index.js

import Head from "next/head";
import { useEffect } from "react";

export default function Home() {
  // Carga el script de embeds de Instagram una sola vez
  useEffect(() => {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    const script = document.createElement("script");
    script.src = "//www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen px-4 py-6 max-w-5xl mx-auto bg-white text-black dark:bg-zinc-950 dark:text-white transition-colors duration-300">
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
        Esta es la página oficial del{" "}
        <strong>Campeonato de Trivias de WWE</strong>, un torneo competitivo donde
        fanáticos de la lucha libre responden preguntas sobre luchadores, eventos
        históricos, títulos, movimientos y mucho más. Representá a tu luchador
        favorito en RAW, SmackDown o NXT y acumulá victorias para llegar a
        lo más alto del ranking.
      </p>

      {/* ── Sección Instagram ─────────────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold mb-6 text-center">
        Últimas publicaciones en Instagram
      </h2>

      {/*
        OPCIÓN A — Embed del perfil completo (muestra el feed como widget oficial).
        Reemplazá la URL si cambiás de cuenta.
        Si preferís embeds de posts individuales, usá la OPCIÓN B más abajo.
      */}
      <div className="flex justify-center mb-10">
        <blockquote
          className="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/triviaswwe/"
          data-instgrm-version="14"
          style={{
            background: "#FFF",
            border: 0,
            borderRadius: "3px",
            boxShadow: "0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)",
            margin: "1px",
            maxWidth: "540px",
            minWidth: "326px",
            padding: 0,
            width: "100%",
          }}
        />
      </div>

      {/*
        OPCIÓN B — Posts individuales (descomentar y pegar shortcodes reales).
        Cada shortcode es la parte final de la URL de un post:
        https://www.instagram.com/p/SHORTCODE/

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {[
            "SHORTCODE_1",
            "SHORTCODE_2",
            "SHORTCODE_3",
          ].map((code) => (
            <div key={code} className="flex justify-center">
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={`https://www.instagram.com/p/${code}/`}
                data-instgrm-version="14"
                style={{ maxWidth: "320px", width: "100%" }}
              />
            </div>
          ))}
        </div>
      */}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t pt-6 text-sm text-center border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 space-y-2">
        <p>
          Seguinos en{" "}
          <a
            href="https://www.instagram.com/triviaswwe"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 dark:text-sky-300 hover:underline"
          >
            Instagram
          </a>{" "}
          |{" "}
          <a
            href="https://www.youtube.com/@TriviasWWE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 dark:text-red-400 hover:underline"
          >
            YouTube
          </a>{" "}
          |{" "}
          <a
            href="https://discord.gg/yPUV8cg8"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Discord
          </a>{" "}
          |{" "}
          <a
            href="https://chat.whatsapp.com/D7vkfUKTujZ8nr6xlQj02C"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 dark:text-green-400 hover:underline"
          >
            WhatsApp
          </a>
        </p>
        <p>&copy; {new Date().getFullYear()} Trivias WWE. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}