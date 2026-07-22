export const metadata = {
  title: "Privacy Policy — LunchSpecial",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg border flex flex-col gap-5 text-sm text-gray-700">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-gray-400 mt-1">Last updated: 22 July 2026</p>
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
          <li>Usage data collected via Google Analytics (e.g. pages viewed, approximate location, device/browser type) to understand how the site is used.</li>
          <li>If we're showing ads (via Google AdSense), Google and its advertising partners may collect data through cookies to serve and measure ads — see the Cookies section below.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Why we collect it</h2>
        <ul className="list-disc list-inside flex flex-col gap-1">
          <li>To run your account — logging in, posting, commenting, voting, and notifications.</li>
          <li>To send you the deals digest email, but only if you've explicitly opted in.</li>
          <li>To keep the site secure and working properly.</li>
          <li>To understand how people use the site and improve it, via Google Analytics.</li>
          <li>To show ads, once we're approved for Google AdSense, which helps fund running the site.</li>
        </ul>
        <p className="mt-1.5">
          We don't sell your personal information. We don't hand it to advertisers directly
          ourselves — but if we show ads via Google AdSense, Google acts as an independent
          advertising provider on the site and may use cookies of its own; see the Cookies
          section below for what that means and how to opt out.
        </p>
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
        <p className="mt-1.5">
          We also use Google for analytics (Google Analytics) and, once approved, advertising
          (Google AdSense). Unlike the providers above, Google may use data collected through
          these services for its own purposes too, under{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 underline"
          >
            Google's own privacy policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Cookies</h2>
        <p>We use one essential cookie to keep you logged in.</p>
        <p className="mt-1.5">
          We use Google Analytics to understand how the site is used, which sets its own cookies.
        </p>
        <p className="mt-1.5">
          This site may also show ads served by Google AdSense. Google and its advertising
          partners use cookies to serve ads based on your visits to this and other websites. You
          can opt out of personalised advertising by visiting{" "}
          <a
            href="https://adssettings.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 underline"
          >
            Google Ads Settings
          </a>
          , or opt out of third-party vendors' use of cookies for personalised advertising by
          visiting{" "}
          <a
            href="https://www.aboutads.info/choices"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 underline"
          >
            www.aboutads.info/choices
          </a>
          . You can read more about how Google uses data from sites that use its services at{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 underline"
          >
            policies.google.com/technologies/partner-sites
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="font-bold text-gray-900 mb-1.5">Your choices and rights</h2>
        <ul className="list-disc list-inside flex flex-col gap-1">
          <li>Update your nickname or marketing preference anytime in your profile.</li>
          <li>Unsubscribe from marketing emails instantly via the link in every email — no login needed.</li>
          <li>Opt out of personalised ads at any time — see the Cookies section above for how.</li>
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
