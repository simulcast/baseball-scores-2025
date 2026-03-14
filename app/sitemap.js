const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export default function sitemap() {
  return [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
