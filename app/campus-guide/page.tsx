import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, INSTITUTION_NAME, INSTITUTION_OFFICIAL_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Campus Guide, Building Directory & FAQ',
  description:
    'Explore Siliguri Institute of Technology (SIT) in 3D. Learn how to use the interactive campus map, building directory, walking directions, and virtual fresher tour.',
  alternates: {
    canonical: '/campus-guide',
  },
  openGraph: {
    title: 'SIT 3D Digital Twin — Campus Guide & FAQ',
    description:
      'Complete guide to exploring academic buildings, laboratories, hostels, sports grounds, and walking routes at Siliguri Institute of Technology.',
    url: `${SITE_URL}/campus-guide`,
    type: 'article',
  },
};

const faqs = [
  {
    q: 'What is the SIT 3D Digital Twin?',
    a: 'The SIT 3D Digital Twin is an interactive WebGL-based 3D campus map and virtual exploration platform for Siliguri Institute of Technology. It allows students, freshers, faculty, and visitors to explore campus buildings, search rooms and laboratories, view walking directions, and take a guided virtual campus tour directly in a web browser.',
  },
  {
    q: 'What is Siliguri Institute of Technology?',
    a: 'Siliguri Institute of Technology (SIT) is an engineering and management institution located in Salbari, Siliguri, West Bengal, India. The campus includes academic blocks, specialized engineering laboratories, a central digital library, workshops, hostels, sports facilities, and landscaped green areas.',
  },
  {
    q: 'How can visitors explore the campus?',
    a: 'Visitors can orbit, pan, and zoom around the 3D campus using mouse or touch controls, switch between 3D perspective and top-down 2D map views, toggle between Day Mode and Night Mode, and click any building or outdoor facility to inspect its details.',
  },
  {
    q: 'How can users find academic buildings?',
    a: 'You can click directly on any 3D building on the map—such as the Main Academic & Technology Block, Management & Computer Applications Block, First Year Block, or Workshops—or select it from the search bar and category filters (Academic, Labs, Food, Hostels, Sports).',
  },
  {
    q: 'How does building search work?',
    a: 'The top search bar indexes campus buildings, floor-by-floor classrooms, laboratories, departments, and outdoor amenities. Selecting any search result smoothly moves the 3D camera to that location and opens its facility directory.',
  },
  {
    q: 'How can users use campus directions?',
    a: 'Click the Directions button in the header (or the Navigate button inside any building details panel), choose a Starting Point and Destination, and the built-in A* pathfinding engine calculates the shortest campus walking route with total distance, estimated walking time, and turn-by-turn steps.',
  },
  {
    q: 'What is the Fresher Tour?',
    a: 'The Fresher Tour is a guided 9-stop virtual campus orientation that flies the camera smoothly across key landmarks—from the Main Entrance & Security Gate and Administration Block to the Main Academic Complex, Central Garden, First Year Block, Canteen, Hostels, and Sports Ground.',
  },
  {
    q: 'What campus facilities are represented?',
    a: 'The digital twin models the Main Academic & Technology Block, Central Library & Administrative Block, Management Block, First Year Block, Engineering Workshops, Boys’ and Girls’ Hostels, Central Canteen & Indoor Sports, Basketball Court, Volleyball Court, SIT Main Sports Ground, Central Garden, bridges, and surrounding tea gardens.',
  },
];

export default function CampusGuidePage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'SIT 3D Digital Twin',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Campus Guide & FAQ',
        item: `${SITE_URL}/campus-guide`,
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-[100dvh] bg-[#070b14] text-slate-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-white p-0.5 flex items-center justify-center overflow-hidden">
              <img
                src="/sit-logo.webp"
                alt="Siliguri Institute of Technology Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-sm text-white block group-hover:text-cyan-300 transition-colors">
                {INSTITUTION_NAME}
              </span>
              <span className="text-[11px] text-cyan-400">3D Campus Digital Twin</span>
            </div>
          </Link>

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            Launch 3D Campus →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Hero Overview */}
        <section className="space-y-4">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 flex items-center gap-2">
            <Link href="/" className="hover:text-cyan-400 transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-200">Campus Guide &amp; FAQ</span>
          </nav>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Explore Siliguri Institute of Technology in 3D
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            Discover the campus of Siliguri Institute of Technology (SIT) through an interactive 3D
            digital twin. Explore academic buildings, laboratories, campus facilities, and walking
            routes through an immersive virtual campus experience accessible on desktop and mobile
            browsers.
          </p>
        </section>

        {/* Feature Sections */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5" aria-label="Platform Capabilities">
          <article className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h2 className="text-lg font-semibold text-white">Interactive Campus Map</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Navigate the entire SIT Salbari campus in real-time 3D or switch to a top-down 2D
              map view. Toggle between realistic Day Mode and illuminated Night Mode to inspect
              buildings, bridges, roads, and landscaped areas.
            </p>
          </article>

          <article className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h2 className="text-lg font-semibold text-white">Explore Campus Buildings</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Click any structure to open the SIT building directory with floor-by-floor room,
              laboratory, and department listings, including the Main Academic &amp; Technology Block,
              Central Library &amp; Admin Block, Management Block, and First Year Block.
            </p>
          </article>

          <article className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h2 className="text-lg font-semibold text-white">Campus Navigation and Directions</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Use the Directions drawer to compute optimal walking routes across campus pathways
              using the A* pathfinding graph, complete with distance in meters, estimated walking
              time, and turn-by-turn guidance.
            </p>
          </article>

          <article className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h2 className="text-lg font-semibold text-white">Virtual Fresher Tour</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              New students and visitors can start the 9-stop guided Fresher Tour from the header to
              automatically fly across key campus landmarks with curated highlights and descriptions.
            </p>
          </article>

          <article className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 md:col-span-2">
            <h2 className="text-lg font-semibold text-white">Campus Facilities</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Beyond academic blocks and engineering labs, the SIT 3D Digital Twin includes the
              Central Canteen &amp; Indoor Sports complex, Basketball Court, Volleyball Court, SIT
              Main Sports Ground, Boys’ and Girls’ Hostels, Central Garden, and surrounding tea
              gardens.
            </p>
          </article>
        </section>

        {/* AEO FAQ Section */}
        <section className="space-y-5" aria-label="Frequently Asked Questions">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((item) => (
              <article
                key={item.q}
                className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2"
              >
                <h3 className="text-base font-semibold text-cyan-300">{item.q}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            SIT 3D Digital Twin •{' '}
            <a
              href={INSTITUTION_OFFICIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              Official Siliguri Institute of Technology Website
            </a>
          </p>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 font-semibold">
            Return to Interactive 3D Campus Map →
          </Link>
        </footer>
      </main>
    </div>
  );
}
