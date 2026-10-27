// pages/records/[section]/[type].js
import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import pool from "../../../lib/db";
import Spinner from "../../../components/Spinner";
import RecordsNav from "../../../components/records/RecordsNav";
import GeneralRecordsContent from "../../../components/records/GeneralRecordsContent";
import SlammyAwardsContent from "../../../components/records/SlammyAwardsContent";
import { getGeneralRecordsData } from "../../../lib/records/getGeneralRecordsData";
import { getSlammyData } from "../../../lib/records/getSlammyData";

const VALID_SECTIONS = ["general", "slammy-awards"];
const VALID_TYPES = ["wrestler", "interpreter"];

export async function getServerSideProps(context) {
  const { res, params } = context;
  if (res) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  }

  const { section, type } = params || {};

  if (!VALID_SECTIONS.includes(section) || !VALID_TYPES.includes(type)) {
    return { notFound: true };
  }

  try {
    let data = null;
    if (section === "general") {
      data = await getGeneralRecordsData(pool, type);
    } else if (section === "slammy-awards") {
      data = await getSlammyData(pool, type);
    }

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

export default function RecordsSectionPage({ error, section, type, data }) {
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
          {section === "slammy-awards"
            ? "Slammy Awards — Trivias WWE"
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

          {/* 2-Level Navigation Header */}
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
            <div className="flex justify-center items-center py-20">
              <Spinner />
            </div>
          ) : (
            <>
              {section === "general" && (
                <GeneralRecordsContent data={data} type={type} />
              )}
              {section === "slammy-awards" && (
                <SlammyAwardsContent data={data} type={type} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

