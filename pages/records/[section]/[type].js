// pages/records/[section]/[type].js
import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import pool from "../../../lib/db";
import { RecordsContentSkeleton } from "../../../components/Skeletons";
import RecordsNav from "../../../components/records/RecordsNav";
import SpecialMatchesContent from "../../../components/records/SpecialMatchesContent";
import { getSpecialMatchesData } from "../../../lib/records/getSpecialMatchesData";

const LEGACY_TYPE_SECTIONS = ["general", "slammy-awards", "distinctions"];
const VALID_SPECIAL_TYPES = ["royal-rumble", "elimination-chamber"];

export async function getServerSideProps(context) {
  const { res, params } = context;
  if (res) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  }

  const { section, type } = params || {};

  // Redirect legacy /records/[section]/wrestler|interpreter URLs to /records/[section]
  if (LEGACY_TYPE_SECTIONS.includes(section)) {
    return {
      redirect: {
        destination: `/records/${section}`,
        permanent: false,
      },
    };
  }

  if (section !== "special-matches" || !VALID_SPECIAL_TYPES.includes(type)) {
    return { notFound: true };
  }

  try {
    const data = await getSpecialMatchesData(pool, type);

    return {
      props: {
        section,
        type,
        data: JSON.parse(JSON.stringify(data)),
      },
    };
  } catch (error) {
    console.error(`Error loading records for section=${section}, type=${type}:`, error);
    return {
      props: {
        error: true,
        section,
        type,
      },
    };
  }
}

export default function RecordsSectionSubPage({ error, section, type, data }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = (url) => {
      if (url !== router.asPath) setLoading(true);
    };
    const handleComplete = () => setLoading(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  return (
    <>
      <Head>
        <title>
          {type === "elimination-chamber"
            ? "Elimination Chamber — Special Matches — Trivias WWE"
            : "Royal Rumble — Special Matches — Trivias WWE"}
        </title>
        <meta
          name="description"
          content="Historical statistics, rankings and awards for Trivias WWE."
        />
      </Head>

      <div className="min-h-screen bg-white text-black dark:bg-zinc-950 dark:text-white transition-colors duration-300 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
              Hall of Records
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Historical statistics, rankings and awards for Trivias WWE.
            </p>
          </div>

          <RecordsNav currentSection={section} currentType={type} />

          {error ? (
            <div className="p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h2 className="text-xl font-bold mb-2 text-red-600 dark:text-red-400">
                Error loading records
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                There was a problem connecting to the database.
              </p>
            </div>
          ) : loading ? (
            <RecordsContentSkeleton />
          ) : (
            <SpecialMatchesContent data={data} subType={type} />
          )}
        </div>
      </div>
    </>
  );
}
