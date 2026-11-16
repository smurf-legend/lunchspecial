/** @type {import('next').NextConfig} */
const nextConfig = {
  // The site is Sydney/NSW only: the old state and region pages were removed,
  // so send their (previously indexed) URLs to the homepage.
  async redirects() {
    return [
      { source: "/:state(nsw|vic|qld|wa|sa|tas|act|nt)", destination: "/", permanent: true },
      { source: "/regions/:path*", destination: "/", permanent: true },
    ];
  },
};
module.exports = nextConfig;
