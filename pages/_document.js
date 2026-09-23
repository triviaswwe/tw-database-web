// pages/_document.js

import { Html, Head, Main, NextScript } from 'next/document';

// Tu dominio base de Vercel Blob
const BLOB_BASE_URL = 'https://ljejfdquofuxccca.public.blob.vercel-storage.com';

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="icon" type="image/x-icon" href={`${BLOB_BASE_URL}/favicon2026.ico`} />
        <meta name="theme-color" content="#000000" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}