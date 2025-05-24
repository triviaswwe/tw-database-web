// components/Layout.js

import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const router = useRouter();

  const navLinkClass = (path) => {
    const isActive = router.pathname.startsWith(path);
    return `
      px-3 py-1 rounded transition duration-150
      ${isActive ? 'bg-gray-900 font-semibold' : 'hover:bg-gray-700'}
    `;
  };

  return (
    <>
      <nav className="bg-gray-800 p-4 text-white flex items-center space-x-4">
        {/* Logo a la izquierda */}
        <Link href="/">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-10 w-auto mr-4 cursor-pointer"
          />
        </Link>

        {/* Links de navegación */}
        <Link href="/wrestlers" className={navLinkClass('/wrestlers')}>
          Wrestlers
        </Link>
        <Link href="/interpreters" className={navLinkClass('/interpreters')}>
          Interpreters
        </Link>
        <Link href="/events" className={navLinkClass('/events')}>
          Events
        </Link>
        <Link href="/championships" className={navLinkClass('/championships')}>
          Championships
        </Link>
      </nav>

      <main>{children}</main>
    </>
  );
}
