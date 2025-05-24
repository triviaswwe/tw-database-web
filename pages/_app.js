// pages/_app.js

import { useEffect, useState } from 'react';
import '../styles/globals.css';
import Layout from '../components/Layout';

export default function MyApp({ Component, pageProps }) {
  const [isDark, setIsDark] = useState(false);

  // Lee el modo al cargar
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    setIsDark(stored === 'dark');
  }, []);

  // Aplica la clase dark y guarda en localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <Layout isDark={isDark} setIsDark={setIsDark}>
      <Component {...pageProps} />
    </Layout>
  );
}
