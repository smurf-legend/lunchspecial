export const metadata = {
  title: "Privacy Policy — LunchSpecial",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg border flex flex-col gap-5 text-sm text-gray-700">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-gray-400 mt-1">Last updated: 16 July 2026</p>
      </div>

      <p>
        LunchSpecial ("we", "us") runs lunchspecial.com.au, a community site for finding and
        sharing lunch deals across Sydney. This policy explains what personal information we
        collect, why, and what control you have over it. We handle your information in line with
        the Australian Privacy Act 1988 (Cth) and the Spam Act 2003 (Cth).
      </p>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">What we collect</h2>
        <ul className="list-disc list-inside flex flex-col gap-1">
          <li>Nickname, email address, and password (stored as a secure hash, never in plain text) when you create an account.</li>
          <li>Content you choose to post — specials, comments, votes, and reactions — which is public by design.</li>
          <li>Your marketing email preference (opted out by default until you explicitly opt in).</li>
          <li>Standard technical logs collected automatically by our hosting provider (e.g. IP address, browser type) for security and reliability — we don't use this for tracking or profiling.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Why we collect it</h2>
        <ul className="list-disc list-inside flex flex-col gap-1">
          <li>To run your account — logging in, posting, commenting, voting, and notifications.</li>
          <li>To send you the deals digest email, but only if you've explicitly opted in.</li>
          <li>To keep the site secure and working properly.</li>
        </ul>
        <p className="mt-1.5">We don't sell your personal information, and we don't share it with advertisers.</p>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Who we share it with</h2>
        <p>
          We use third-party services to run the site, who process data on our behalf under their
          own security and privacy standards: a database provider (Neon) to store site data, a
          hosting provider (Vercel) to run the site and store uploaded images, and — only if you
          opt in — an email delivery provider to send the deals digest. None of these providers
          are permitted to use your data for their own purposes.
        </p>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Cookies</h2>
        <p>
          We use one essential cookie to keep you logged in. We don't use advertising or
          cross-site tracking cookies. If we add analytics in the future, we intend to use
          privacy-friendly tools that don't rely on tracking cookies.
        </p>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Your choices and rights</h2>
        <ul className="list-disc list-inside flex flex-col gap-1">
          <li>Update your nickname or marketing preference anytime in your profile.</li>
          <li>Unsubscribe from marketing emails instantly via the link in every email — no login needed.</li>
          <li>Request a copy of your data, or ask us to correct or delete it, by contacting us below.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Data retention</h2>
        <p>
          We keep your account information for as long as your account is active. If you ask us
          to delete your account, we'll remove your personal information, though public posts and
          comments may be retained in an anonymised form to keep discussion threads intact.
        </p>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Children</h2>
        <p>LunchSpecial isn't intended for children under 15, and we don't knowingly collect information from them.</p>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Changes to this policy</h2>
        <p>
          If we make material changes to this policy, we'll update the date at the top of this
          page. Continued use of the site after changes means you accept the updated policy.
        </p>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Contact us</h2>
        <p>
          Questions about this policy or your data? Email{" "}
          <a href="mailto:team@lunchspecial.com.au" className="text-orange-600 underline">
            team@lunchspecial.com.au
          </a>
          .
        </p>
      </section>
    </div>
  );
}
