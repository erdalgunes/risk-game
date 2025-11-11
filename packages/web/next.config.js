/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@risk-poc/game-engine', '@risk-poc/database'],
  reactStrictMode: true,
};

module.exports = nextConfig;
