/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // puppeteer-core is server-only and must not be bundled. axe-core ships a huge
  // browser-source string we inject at runtime — keep it external too.
  serverExternalPackages: ["puppeteer-core", "axe-core"],
};

export default nextConfig;
