// components/Layout.js

import Link from 'next/link';
import { useRouter } from 'next/router';
import { Sun, Moon } from 'lucide-react';

export default function Layout({ children, isDark, setIsDark }) {
  const router = useRouter();

  const navLinkClass = (path) => {
    const isActive = router.pathname.startsWith(path);
    return `
      px-3 py-1 rounded transition duration-150 whitespace-nowrap
      ${isActive
        ? 'bg-gray-900 dark:bg-gray-200 dark:text-black font-semibold'
        : 'hover:bg-gray-700 dark:hover:bg-gray-300 dark:hover:text-black'}
    `;
  };

  return (
    <div className="min-h-screen bg-background-light text-black dark:bg-zinc-950 dark:text-white">
      <nav className="bg-gray-900 dark:bg-gray-700 p-4 text-white flex items-center">
        {/* 1) Logo fijo */}
        <div className="flex-shrink-0 mr-4">
          <Link href="/">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-10 w-auto cursor-pointer"
            />
          </Link>
        </div>

        {/* 2) Enlaces deslizables */}
        <div className="flex-1 overflow-x-auto hide-scrollbar">
          <div className="flex space-x-4">
            <Link href="/wrestlers" className={navLinkClass('/wrestlers')}>
              Wrestlers
            </Link>
            <Link
              href="/interpreters"
              className={navLinkClass('/interpreters')}
            >
              Interpreters
            </Link>
            <Link href="/events" className={navLinkClass('/events')}>
              Events
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

      <main className="p-4">{children}</main>
    </div>
  );
}
