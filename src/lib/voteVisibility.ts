import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Voting requires a logged-in account (see /api/specials/[id]/vote), so at
// this stage every count can only ever come from the handful of accounts
// that already exist — a wall of "😋 0 🤢 0" on every card signals "nobody
// uses this site" more than it provides useful signal. Hide the counts
// (voting itself stays fully functional, still feeding the "hot" sort)
// until there's a real base of users who could plausibly have cast them.
const MIN_USERS_TO_SHOW_VOTE_COUNTS = 50;

export const shouldShowVoteCounts = cache(async () => {
  const userCount = await prisma.user.count();
  return userCount >= MIN_USERS_TO_SHOW_VOTE_COUNTS;
});
