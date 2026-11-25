// pages/records/[section].js
import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import pool from "../../lib/db";
import { RecordsContentSkeleton } from "../../components/Skeletons";
import RecordsNav from "../../components/records/RecordsNav";
import GeneralRecordsContent from "../../components/records/GeneralRecordsContent";
import SlammyAwardsContent from "../../components/records/SlammyAwardsContent";
import DistinctionsContent from "../../components/records/DistinctionsContent";
import {
  getGeneralRecordsData,
  fetchSharedGeneralRecordsData,
} from "../../lib/records/getGeneralRecordsData";
import { getSlammyData } from "../../lib/records/getSlammyData";
import { getDistinctionsData } from "../../lib/records/getDistinctionsData";

const MAIN_SECTIONS = ["general", "slammy-awards", "distinctions"];

export async function getServerSideProps(context) {
  const { res, params } = context;

  const { section } = params || {};
  const rawYear = context.query?.year;
  const parsedYear =
    typeof rawYear === "string" && /^\d{4}$/.test(rawYear)
      ? parseInt(rawYear, 10)
      : null;
  const validYear =
    parsedYear !== null && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : null;

  // Legacy redirects
  if (section === "wrestler" || section === "interpreter") {
    return {
      redirect: {
        destination: "/records/general",
        permanent: false,
      },
    };
  }

  if (section === "special-matches") {
    return {
      redirect: {
        destination: "/records/special-matches/royal-rumble",
        permanent: false,
      },
    };
  }

  if (section === "royal-rumble" || section === "elimination-chamber") {
    return {
      redirect: {
        destination: `/records/special-matches/${section}`,
        permanent: false,
      },
    };
  }

  if (!MAIN_SECTIONS.includes(section)) {
    return {
      redirect: {
        destination: "/records",
        permanent: false,
      },
    };
  }

  try {
    let wrestler = null;
    let interpreter = null;
    let years = null;

    if (section === "general") {
      const sharedGeneralPromise = fetchSharedGeneralRecordsData(pool, validYear);
      const [sharedGeneral, wData, iData] = await Promise.all([
        sharedGeneralPromise,
        getGeneralRecordsData(pool, "wrestler", sharedGeneralPromise, validYear),
        getGeneralRecordsData(pool, "interpreter", sharedGeneralPromise, validYear),
      ]);
      wrestler = wData;
      interpreter = iData;
      years = sharedGeneral.availableYears || [];
    } else if (section === "slammy-awards") {
      [wrestler, interpreter] = await Promise.all([
        getSlammyData(pool, "wrestler"),
        getSlammyData(pool, "interpreter"),
      ]);
    } else if (section === "distinctions") {
      [wrestler, interpreter] = await Promise.all([
        getDistinctionsData(pool, "wrestler"),
        getDistinctionsData(pool, "interpreter"),
      ]);
    }

    if (res) {
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
    }

    const payload =
      section === "general"
        ? { wrestler, interpreter, years }
        : { wrestler, interpreter };

    return {
      props: {
        section,
        selectedYear: validYear ? String(validYear) : "all",
        data: JSON.parse(JSON.stringify(payload)),
      },
    };
  } catch (error) {
    console.error(`Error loading records for section=${section}:`, error);
    if (res) {
      res.statusCode = 500;
      res.setHeader("Cache-Control", "no-store");
    }
    return {
      props: {
        error: true,
        section,
        selectedYear: validYear ? String(validYear) : "all",
      },
    };
  }
}

export default function RecordsSectionPage({ error, section, data, selectedYear = "all" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generalMode, setGeneralMode] = useState("wrestler");

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
          {section === "slammy-awards"
            ? "Slammy Awards — Trivias WWE"
            : section === "distinctions"
              ? "Other Distinctions — Trivias WWE"
              : selectedYear !== "all"
                ? `Hall of Records (${selectedYear}) — Trivias WWE`
                : "Hall of Records — Trivias WWE"}
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

          <RecordsNav currentSection={section} />

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
            <>
              {section === "general" && (
                <GeneralRecordsContent
                  data={data}
                  selectedYear={selectedYear}
                  globalMode={generalMode}
                  onGlobalModeChange={setGeneralMode}
                />
              )}
              {section === "slammy-awards" && <SlammyAwardsContent data={data} />}
              {section === "distinctions" && <DistinctionsContent data={data} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
