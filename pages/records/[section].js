// pages/records/[section].js

export async function getServerSideProps(context) {
  const { res, params } = context;
  if (res) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  }

  const { section } = params || {};

  // If visiting /records/wrestler or /records/interpreter -> redirect to /records/general/[type]
  if (section === "wrestler" || section === "interpreter") {
    return {
      redirect: {
        destination: `/records/general/${section}`,
        permanent: false,
      },
    };
  }

  // If visiting /records/general, /records/slammy-awards, or /records/distinctions -> redirect to /records/[section]/wrestler
  if (section === "general" || section === "slammy-awards" || section === "distinctions") {
    return {
      redirect: {
        destination: `/records/${section}/wrestler`,
        permanent: false,
      },
    };
  }

  // Fallback for any other single slug
  return {
    redirect: {
      destination: "/records",
      permanent: false,
    },
  };
}

export default function RecordsRedirect() {
  return null;
}

