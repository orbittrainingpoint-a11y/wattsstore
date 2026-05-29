import Link from 'next/link';

const resources = [
  { name: 'Media Library', href: '/admin/content/media', description: 'Reusable images and uploads' },
  { name: 'Banners', href: '/admin/content/banners', description: 'Homepage and campaign placements' },
  { name: 'Testimonials', href: '/admin/content/testimonials', description: 'Homepage buyer proof' },
  { name: 'Blog', href: '/admin/content/blog', description: 'Editorial posts' },
  { name: 'FAQ', href: '/admin/content/faq', description: 'Help-center questions' },
  { name: 'Legal Pages', href: '/admin/content/legal', description: 'Policies and About content' },
  { name: 'Site Settings', href: '/admin/settings', description: 'Announcement, footer and contact' },
];

export default function ContentHubPage() {
  return (
    <div>
      <div className="section-eyebrow">CMS</div>
      <h1 className="mt-1 text-3xl font-extrabold">Content Hub</h1>
      <p className="mt-2 text-sm text-brand-gray">Manage the customer-facing content library from one workspace.</p>
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <Link key={resource.href} href={resource.href} className="card card-hover p-6">
            <h2 className="font-extrabold text-lg">{resource.name}</h2>
            <p className="mt-2 text-sm text-brand-gray">{resource.description}</p>
            <span className="inline-block mt-5 text-sm font-semibold text-brand-blue">Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
