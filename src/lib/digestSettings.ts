import { prisma } from "@/lib/prisma";
import type { DigestMode } from "@/lib/digest";

// Defaults used until an admin saves custom copy in the kitchen panel — kept
// here (not in mail.ts) so both the mail sender and the settings API/admin
// page can read the same fallback text.
export const DEFAULT_DIGEST_COPY: Record<DigestMode, { subject: string; intro: string }> = {
  friday: {
    subject: "Try these specials next week",
    intro: "Planning your week? Here are some lunch specials near you that you haven't tried yet.",
  },
  monday: {
    subject: "This week's top rated lunch specials",
    intro: "Didn't get a chance to plan ahead? Here are the best rated lunch specials near you.",
  },
};

export async function getDigestSettings() {
  const row = await prisma.digestSettings.findUnique({ where: { id: 1 } });
  return {
    paused: row?.paused ?? false,
    friday: {
      subject: row?.fridaySubject || DEFAULT_DIGEST_COPY.friday.subject,
      intro: row?.fridayIntro || DEFAULT_DIGEST_COPY.friday.intro,
    },
    monday: {
      subject: row?.mondaySubject || DEFAULT_DIGEST_COPY.monday.subject,
      intro: row?.mondayIntro || DEFAULT_DIGEST_COPY.monday.intro,
    },
  };
}
