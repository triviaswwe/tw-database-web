// pages/events/classic-view.js
import EventsView from "../../components/EventsView";

export default function EventsClassicViewPage({ isDark }) {
  return <EventsView activeTab="classic" isDark={isDark} />;
}
