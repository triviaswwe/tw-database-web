// pages/records/index.js
import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { RecordsContentSkeleton } from "../../components/Skeletons";
import RecordsNav from "../../components/records/RecordsNav";

export default function RecordsIndex() {
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
        <title>Hall of Records — Trivias WWE</title>
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

          <RecordsNav />

          {loading ? (
            <RecordsContentSkeleton />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Select a category
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Click one of the tabs above to view reigns or historical records.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
