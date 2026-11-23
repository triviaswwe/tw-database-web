// pages/events/index.js
import EventsView from "../../components/EventsView";

export default function EventsIndexPage({ isDark }) {
  return <EventsView activeTab="classic" isDark={isDark} />;
}
