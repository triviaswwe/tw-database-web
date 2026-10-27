// pages/records/index.js

export async function getServerSideProps(context) {
  const { res } = context;
  if (res) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  }

  return {
    redirect: {
      destination: "/records/general/wrestler",
      permanent: false,
    },
  };
}

export default function RecordsIndex() {
  return null;
}
