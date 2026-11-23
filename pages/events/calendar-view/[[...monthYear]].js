// pages/events/calendar-view/[[...monthYear]].js
import EventsView, { parseCalendarSlug } from "../../../components/EventsView";

export async function getServerSideProps({ params, res }) {
  const segments = params?.monthYear;

  if (!segments || segments.length === 0) {
    if (res) {
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600",
      );
    }
    return {
      props: {
        initialYear: null,
        initialMonth: null,
      },
    };
  }

  if (segments.length > 1) {
    return { notFound: true };
  }

  const parsed = parseCalendarSlug(segments[0]);
  if (!parsed) {
    return { notFound: true };
  }

  if (res) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );
  }

  return {
    props: {
      initialYear: parsed.year,
      initialMonth: parsed.month,
    },
  };
}

export default function EventsCalendarViewPage({
  initialYear = null,
  initialMonth = null,
  isDark,
}) {
  return (
    <EventsView
      activeTab="calendar"
      initialYear={initialYear}
      initialMonth={initialMonth}
      isDark={isDark}
    />
  );
}
