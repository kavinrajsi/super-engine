/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // puppeteer-core is server-only and must not be bundled.
  serverExternalPackages: ["puppeteer-core"],
};

export default nextConfig;
