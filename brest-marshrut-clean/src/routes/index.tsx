import { createFileRoute } from "@tanstack/react-router";
import { MapOverlay } from "@/components/map-overlay";
import { MapView } from "@/components/map-view";
import { StopPanel } from "@/components/stop-panel";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="relative h-[100dvh] overflow-hidden bg-bg">
      <MapView />
      <StopPanel />
      <MapOverlay />
    </main>
  );
}
