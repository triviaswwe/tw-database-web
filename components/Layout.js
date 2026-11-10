// components/Layout.js

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { Sun, Moon } from "lucide-react";

// Tu dominio base de Vercel Blob
const BLOB_BASE_URL = "https://ljejfdquofuxccca.public.blob.vercel-storage.com";

export default function Layout({ children, isDark, setIsDark }) {
  const router = useRouter();

  const navLinkClass = (path) => {
    const isActive = router.pathname.startsWith(path);
    return `
      px-3 py-1 rounded transition duration-150 whitespace-nowrap
      ${
        isActive
          ? "bg-gray-900 dark:bg-gray-700 font-semibold"
          : "hover:bg-gray-700 dark:hover:bg-gray-300 dark:hover:text-black"
      }
    `;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light text-black dark:bg-zinc-950 dark:text-white transition-colors duration-300">
      <nav
        aria-label="Navegación principal"
        className="bg-gray-900 dark:bg-gray-700 p-4 text-white flex items-center"
      >
        {/* 1) Logo fijo apuntando a Vercel Blob */}
        <div className="flex-shrink-0 mr-4">
          <Link href="/">
            <Image
              src={`${BLOB_BASE_URL}/logo.png`}
              alt="Logo"
              width={160}
              height={40}
              style={{ width: "auto" }}
              className="h-10 w-auto cursor-pointer"
              priority
            />
          </Link>
        </div>

        {/* 2) Enlaces deslizables */}
        <div className="flex-1 overflow-x-auto hide-scrollbar">
          <div className="flex space-x-4">
            <Link href="/wrestlers" className={navLinkClass("/wrestlers")}>
              Wrestlers
            </Link>
            <Link
              href="/interpreters"
              className={navLinkClass("/interpreters")}
            >
              Interpreters
            </Link>
            <Link href="/stables" className={navLinkClass("/stables")}>
              Stables & Tag Teams
            </Link>
            <Link href="/events" className={navLinkClass("/events")}>
              Events
            </Link>
            <Link
              href="/championships"
              className={navLinkClass("/championships")}
            >
              Championships
            </Link>
            <Link href="/rules" className={navLinkClass("/rules")}>
              Rules
            </Link>
            <Link
              href="/stipulations"
              className={navLinkClass("/stipulations")}
            >
              Stipulations
            </Link>
            <Link href="/records" className={navLinkClass("/records")}>
              Records
            </Link>
            {/* Añade más links aquí si los necesitas */}
          </div>
        </div>

        {/* 3) Toggle dark mode fijo */}
        <div className="flex-shrink-0 ml-4">
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full transition-colors duration-200 hover:bg-gray-700 dark:hover:bg-gray-600"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun size={20} className="text-yellow-400" />
            ) : (
              <Moon size={20} className="text-white" />
            )}
          </button>
        </div>
      </nav>

      <main className="p-4 flex-grow">{children}</main>

      <footer className="bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center md:text-left">
            {/* 1) Brand / Logo */}
            <div className="col-span-2 md:col-span-1 space-y-4 flex flex-col items-center md:items-start text-center md:text-left mb-2 md:mb-0">
              <Link href="/">
                <Image
                  src={`${BLOB_BASE_URL}/FOOTER.png`}
                  alt="Trivias WWE Footer Logo"
                  width={200}
                  height={60}
                  className="h-12 w-auto cursor-pointer"
                  style={{ width: "auto" }}
                />
              </Link>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                The ultimate database for Trivias WWE. Explore wrestlers,
                championships, events and keep track of our community records.
              </p>
            </div>

            {/* 2) Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                Quick Links
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/wrestlers"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                  >
                    Wrestlers Directory
                  </Link>
                </li>
                <li>
                  <Link
                    href="/championships"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                  >
                    Championships
                  </Link>
                </li>
                <li>
                  <Link
                    href="/records"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                  >
                    Records
                  </Link>
                </li>
                <li>
                  <Link
                    href="/rules"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                  >
                    Rules
                  </Link>
                </li>
              </ul>
            </div>

            {/* 3) Community / Social */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                Community
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://www.instagram.com/triviaswwe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.youtube.com/@TriviasWWE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    YouTube
                  </a>
                </li>
                <li>
                  <a
                    href="https://discord.gg/YmBJQPfQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    Discord
                  </a>
                </li>
                <li>
                  <a
                    href="https://chat.whatsapp.com/D7vkfUKTujZ8nr6xlQj02C"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer / Disclaimer */}
          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center md:text-left max-w-3xl leading-relaxed">
                Trivias WWE uses
                images of wrestlers, championships, and events solely for
                identification purposes and does not claim ownership rights over
                them. All rights to these images are held by the wrestlers and
                wrestling organizations, including WWE.
              </p>
              <div className="text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                Built by &copy; {new Date().getFullYear()} Trivias WWE for the Community.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
