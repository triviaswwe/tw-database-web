import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Spinner from "../../components/Spinner";
import ChampionshipRecords from "../../components/ChampionshipRecords";

export default function ChampionshipRecordsPage() {
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

  const tabClasses = (isActive) =>
    `pb-2 px-1 border-b-2 font-medium text-lg transition-colors cursor-pointer ${
      isActive
        ? "border-blue-500 text-blue-600 dark:text-sky-400"
        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
    }`;

  return (
    <>
      <Head>
        <title>Championship Records — Trivias WWE</title>
        <meta name="description" content="Championship records, Grand Slam, and Triple Crown." />
      </Head>

      <div className="p-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold mb-6">Championships</h1>
        </div>

          {/* Tab navigation */}
          <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 mb-6">
            <Link href="/championships/championship-reigns" className={tabClasses(false)}>
              Championship Reigns
            </Link>
            <Link href="/championships/championship-records" className={tabClasses(true)}>
              Championship Records
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-4">
              <ChampionshipRecords />
            </div>
          )}
      </div>
    </>
  );
}
