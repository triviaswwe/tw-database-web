// pages/index.js

import Head from "next/head";
import Script from "next/script";
import ChampionsSection from "../components/ChampionsSection";
import { getCurrentChampions } from "../lib/champions";


export default function Home({ champions, isDark }) {
  // We no longer need the embed.js useEffect because we use direct iframes.

  return (
    <div className="py-6 px-4 max-w-5xl mx-auto overflow-hidden">
      <Head>
        <title>Trivias WWE</title>
        <meta
          name="description"
          content="Join the Trivias WWE Championship and show the world how much you know about wrestling."
        />
      </Head>

      <h1 className="text-4xl font-bold mb-6 text-center">
        Welcome to Trivias WWE
      </h1>

      <p className="text-lg mb-10 max-w-3xl mx-auto text-center">
        This is the official page of the <strong>Trivias WWE Championship</strong>,
        a competitive tournament where wrestling fans answer questions about
        wrestlers, historic events, championships, moves, and much more. Represent
        your favorite wrestler on RAW, SmackDown, or NXT and rack up wins to reach
        the top of the rankings.
      </p>

      <ChampionsSection champions={champions} />

      {/* ── Instagram section ─────────────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold mb-6 text-center">
        LATEST INSTAGRAM POSTS
      </h2>

      {/*
        Definitive, professional solution:
        To get AUTOMATION (the latest 9 posts) + DARK MODE without breaking the UI,
        the industry uses specialized widgets, since Meta/Instagram blocks both
        features in its official code.

        Instructions:
        1. Create a free account at https://elfsight.com/es/instagram-feed-instashow/
        2. Set up your widget with your "@triviaswwe" username.
        3. Set the layout to a 3x3 "Grid" (9 posts).
        4. Set the color scheme to Dark Mode.
        5. Copy the widget ID they provide and replace "YOUR_ELFSIGHT_ID" below.
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