// Games + venues registry (owner config). Multi-game / multi-venue (franchise) ready,
// but only Table & Tales + one venue is registered for MVP. Adding a venue = one row here
// + a relay publishing its data file; adding a game = a new entry (+ later a panel module).

import type { Registry, RegistryVenue } from "./snapshot";

export const REGISTRY: Registry = {
  schemaVersion: 1,
  games: [
    {
      id: "table-and-tales",
      name: "Table & Tales",
      venues: [
        {
          id: "shelter",
          name: "Table & Tales — Shelter",
          gameId: "table-and-tales",
          region: "Shelter",
          slurl: "", // owner to fill (teleport SLurl) before launch
          hoursLabel: "",
          dataPath: "tt/shelter.json",
        },
      ],
    },
  ],
};

export function listVenues(): RegistryVenue[] {
  return REGISTRY.games.flatMap((g) => g.venues);
}

export function findGame(gameId: string) {
  return REGISTRY.games.find((g) => g.id === gameId);
}

export function findVenue(gameId: string, venueId: string): RegistryVenue | undefined {
  return findGame(gameId)?.venues.find((v) => v.id === venueId);
}

// Map a gameId to its URL route segment. Today only Table & Tales exists and lives at /tt/[venue]
// (per the MVP routing decision); future games can use their gameId as the segment.
export function gameRouteSegment(gameId: string): string {
  return gameId === "table-and-tales" ? "tt" : gameId;
}
export function venueHref(gameId: string, venueId: string): string {
  return `/${gameRouteSegment(gameId)}/${venueId}`;
}
