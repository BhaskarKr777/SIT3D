import CampusApp from '@/components/CampusApp';
import {
  SITE_URL,
  SITE_NAME,
  INSTITUTION_NAME,
  INSTITUTION_OFFICIAL_URL,
  DEFAULT_DESCRIPTION,
} from '@/lib/seo';

export default function HomePage() {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: INSTITUTION_NAME,
    alternateName: 'SIT',
    url: INSTITUTION_OFFICIAL_URL,
    logo: `${SITE_URL}/sit-logo.webp`,
    sameAs: [INSTITUTION_OFFICIAL_URL],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: 'Interactive 3D digital campus experience for Siliguri Institute of Technology.',
  };

  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web browser',
    description:
      'Interactive 3D campus exploration, building directory, walking navigation, and virtual fresher tour platform for Siliguri Institute of Technology.',
    publisher: {
      '@type': 'EducationalOrganization',
      name: INSTITUTION_NAME,
      url: INSTITUTION_OFFICIAL_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />

      <CampusApp />

      <noscript>
        <section className="p-8 max-w-3xl mx-auto text-slate-200 space-y-4">
          <h1 className="text-2xl font-bold text-white">
            Explore Siliguri Institute of Technology in 3D
          </h1>
          <p>{DEFAULT_DESCRIPTION}</p>
          <p>
            Please enable JavaScript to interact with the 3D campus map, or read the{' '}
            <a href="/campus-guide" className="text-cyan-400 underline">
              SIT 3D Campus Guide &amp; FAQ
            </a>
            .
          </p>
        </section>
      </noscript>
    </>
  );
}
