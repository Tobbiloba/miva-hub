import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://miva-hub.com';

export default function sitemap(): MetadataRoute.Sitemap {
  // Public routes accessible to all users
  const publicRoutes = [
    {
      url: `${BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/sign-in`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/sign-up`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
  ];

  // Protected routes - only accessible to logged-in users
  // These are still included in sitemap but marked with appropriate priority
  const protectedRoutes = [
    {
      url: `${BASE_URL}/chat`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/student`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/student/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/student/assignments`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/student/grades`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/student/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/student/study`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/faculty`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/faculty/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/faculty/assignments`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/faculty/grades`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/admin`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/admin/departments`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/admin/courses`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/admin/users`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/admin/analytics`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/profile`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  return [...publicRoutes, ...protectedRoutes];
}
