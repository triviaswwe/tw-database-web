// pages/index.js
import Head from "next/head";

export async function getServerSideProps() {
  try {
    // 1) Hacemos fetch de la página pública de Instagram
    const res = await fetch("https://www.instagram.com/triviaswwe/", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await res.text();

    // 2) Extraemos el JSON de window._sharedData
    const sharedDataMatch = html.match(
      /<script[^>]*>\s*window\._sharedData\s*=\s*(\{.+?\});<\/script>/s
    );
    if (!sharedDataMatch) throw new Error("No sharedData on page");
    const sharedData = JSON.parse(sharedDataMatch[1]);

    // 3) Navegamos hasta el array de posts
    const edges =
      sharedData.entry_data.ProfilePage[0].graphql.user
        .edge_owner_to_timeline_media.edges || [];

    // 4) Tomamos solo las primeras 9 publicaciones
    const posts = edges.slice(0, 9).map(({ node }) => ({
      id: node.id,
      shortcode: node.shortcode,
      thumbnail: node.thumbnail_src,
    }));

    return { props: { posts } };
  } catch (error) {
    console.error("Error scraping Instagram:", error);
    return { props: { posts: [] } };
  }
}

export default function Home({ posts }) {
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
        favorito en RAW, SmackDown, NXT o Speed y acumulá victorias para llegar a
        lo más alto del ranking.
      </p>

      <h2 className="text-2xl font-semibold mb-4 text-center">
        Últimas publicaciones en Instagram
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-16">
        {posts.length > 0 ? (
          posts.map((post) => (
            <a
              key={post.id}
              href={`https://www.instagram.com/p/${post.shortcode}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={post.thumbnail}
                alt="Publicación de Instagram"
                className="rounded-lg shadow hover:opacity-80 transition"
              />
            </a>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
            No se pudieron cargar las publicaciones.
          </p>
        )}
      </div>

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
            href="https://www.youtube.com/@TriviasWWE-TriviasWWE"
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
