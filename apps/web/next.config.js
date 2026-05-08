/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@devportal/ui", "@devportal/trpc", "@devportal/db"],
};

module.exports = nextConfig;
