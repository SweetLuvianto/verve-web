import { redirect } from "next/navigation";
import { findGame, venueHref } from "@/lib/games";

// Short link: /go/<venue> -> the venue page. Handy to paste in Discord / in-world.
export function generateStaticParams() {
  return (findGame("table-and-tales")?.venues ?? []).map((v) => ({ venue: v.id }));
}

export default async function Go({ params }: { params: Promise<{ venue: string }> }) {
  const { venue } = await params;
  redirect(venueHref("table-and-tales", venue));
}
