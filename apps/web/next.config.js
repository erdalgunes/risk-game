/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@risk-poc/game-engine', '@risk-poc/database'],
};

module.exports = nextConfig;
