/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  outputFileTracingIncludes: { "/api/cards": ["./data/generated/card-index.json"] },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
