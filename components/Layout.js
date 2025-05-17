import Link from 'next/link';

export default function Layout({ children }) {
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
        <Link href="/wrestlers" className="hover:underline">
          Wrestlers
        </Link>
        <Link href="/events" className="hover:underline">
          Events
        </Link>
      </nav>

      <main>{children}</main>
    </>
  );
}
