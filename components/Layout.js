// components/Layout.js

import Link from "next/link";
import { useRouter } from "next/router";
import { Sun, Moon } from "lucide-react";

// Tu dominio base de Vercel Blob
const BLOB_BASE_URL = 'https://ljejfdquofuxccca.public.blob.vercel-storage.com';

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
      <nav className="bg-gray-900 dark:bg-gray-700 p-4 text-white flex items-center">
        {/* 1) Logo fijo apuntando a Vercel Blob */}
        <div className="flex-shrink-0 mr-4">
          <Link href="/">
            <img
              src={`${BLOB_BASE_URL}/logo.png`}
              alt="Logo"
              className="h-10 w-auto cursor-pointer"
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
            <Link
              href="/rules"
              className={navLinkClass("/rules")}
            >
              Rules
            </Link>
            <Link
              href="/stipulations"
              className={navLinkClass("/stipulations")}
            >
              Stipulations
            </Link>
                        <Link
              href="/records"
              className={navLinkClass("/records")}
            >
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

      <footer className="border-t py-6 text-sm text-center border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 space-y-2 mt-auto">
        <p>
          Seguinos en{" "}
          <a
            href="https://www.instagram.com/triviaswwe"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 dark:text-sky-300 font-medium transition-colors hover:text-sky-700 dark:hover:text-sky-400"
            aria-label="Instagram de Trivias WWE"
          >
            Instagram
          </a>{" "}
          |{" "}
          <a
            href="https://www.youtube.com/@TriviasWWE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 dark:text-red-400 font-medium transition-colors hover:text-red-700 dark:hover:text-red-300"
            aria-label="Canal de YouTube de Trivias WWE"
          >
            YouTube
          </a>{" "}
          |{" "}
          <a
            href="https://discord.gg/YmBJQPfQ"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 font-medium transition-colors hover:text-indigo-700 dark:hover:text-indigo-300"
            aria-label="Servidor de Discord"
          >
            Discord
          </a>{" "}
          |{" "}
          <a
            href="https://chat.whatsapp.com/D7vkfUKTujZ8nr6xlQj02C"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 dark:text-green-400 font-medium transition-colors hover:text-green-700 dark:hover:text-green-300"
            aria-label="Grupo de WhatsApp"
          >
            WhatsApp
          </a>
        </p>
        <p>&copy; {new Date().getFullYear()} Trivias WWE. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}