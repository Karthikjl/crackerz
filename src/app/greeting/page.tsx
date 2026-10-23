import type { Metadata } from "next";
import GreetingClient from "@/components/GreetingClient";

export const metadata: Metadata = {
  title: "Fireworks greeting - Crackerz",
  description: "Write someone's name in fireworks and send them the link.",
};

export default function GreetingPage() {
  return <GreetingClient />;
}
