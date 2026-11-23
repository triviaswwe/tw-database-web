// pages/championships/championship-reigns/[slug].js
import ChampionshipReignsView from "../../../components/ChampionshipReignsView";
import { query, setCacheHeaders, setNoStoreHeaders } from "../../../lib/db";
import { slugifyChampionship } from "../../../hooks/useChampionshipHelpers";

export async function getServerSideProps({ params, res }) {
  const rawSlug = typeof params?.slug === "string" ? params.slug.trim().toLowerCase() : "";
  if (!rawSlug) {
    return { notFound: true };
  }

  try {
    const championships = await query(
      `SELECT id, title_name
       FROM championships
       ORDER BY show_in_ui DESC, id ASC`
    );

    const bySlug = championships.find(
      (c) => slugifyChampionship(c.title_name) === rawSlug
    );
    if (bySlug) {
      if (res) setCacheHeaders(res, 300);
      return {
        props: {
          selectedId: bySlug.id,
          initialTitleName: bySlug.title_name,
        },
      };
    }

    if (/^\d+$/.test(rawSlug)) {
      const byId = championships.find((c) => c.id === Number(rawSlug));
      if (byId) {
        return {
          redirect: {
            destination: `/championships/championship-reigns/${slugifyChampionship(byId.title_name)}`,
            permanent: false,
          },
        };
      }
    }

    return { notFound: true };
  } catch (err) {
    console.error("Error loading championship-reigns slug:", err);
    if (res) {
      res.statusCode = 500;
      setNoStoreHeaders(res);
    }
    return {
      props: {
        error: true,
      },
    };
  }
}

export default function ChampionshipReignsSlugPage({
  selectedId = null,
  initialTitleName = null,
  error = false,
}) {
  return (
    <ChampionshipReignsView
      selectedId={selectedId}
      initialTitleName={initialTitleName}
      error={error}
    />
  );
}
