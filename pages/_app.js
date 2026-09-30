import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import '../styles/globals.css';
import Layout from '../components/Layout';

export default function MyApp({ Component, pageProps }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(localStorage.getItem('theme') === 'dark');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <Layout isDark={isDark} setIsDark={setIsDark}>
      <Component {...pageProps} isDark={isDark} />
      <Analytics />
    </Layout>
  );
}