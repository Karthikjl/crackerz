import type { Metadata } from "next";
import ShowBuilder from "@/components/ShowBuilder";

export const metadata: Metadata = {
  title: "Show builder - Crackerz",
  description: "Choreograph your own fireworks show on a timeline, add music, and share it as a link.",
};

export default function ShowPage() {
  return <ShowBuilder />;
}
