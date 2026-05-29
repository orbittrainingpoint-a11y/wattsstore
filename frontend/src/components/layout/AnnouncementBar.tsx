import { loadSiteSettings } from '@/lib/cms';

const fallbackItems = [
  'Live Regional Product Catalog',
  'Live Regional Product Catalog',
  'Request Formal B2B Pricing',
];

/** CMS-managed utility bar with contact links. */
export async function AnnouncementBar() {
  const settings = await loadSiteSettings();
  if (settings?.announcementBar.enabled === false) return null;
  const items = settings?.announcementBar.items?.length ? settings.announcementBar.items : fallbackItems;
  const contact = settings?.contact ?? {
    phone: '+971 50 000 0000',
    whatsapp: '971500000000',
    email: 'hello@wattsstore.com',
  };
  return (
    <div suppressHydrationWarning className="relative overflow-hidden text-white text-xs font-medium hidden sm:block" style={{ background: 'linear-gradient(90deg,#0b1f3d 0%,#1e4d8c 50%,#0b1f3d 100%)' }}>
      <div suppressHydrationWarning className="container-ws flex items-center justify-between h-9">
        <div suppressHydrationWarning className="relative flex-1 overflow-hidden whitespace-nowrap">
          <div suppressHydrationWarning className="marquee inline-block">
            {[...items, ...items].map((text, i) => (
              <span key={`${text}-${i}`} className="mr-10 inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow" />
                <span className="text-white/90">{text}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 ml-4 shrink-0 text-[11px]">
          <a href={`https://wa.me/${contact.whatsapp}`} className="link-underline hover:text-brand-yellow">{contact.phone}</a>
          <span className="text-white/30">|</span>
          <a href={`mailto:${contact.email}`} className="link-underline hover:text-brand-yellow">{contact.email}</a>
        </div>
      </div>
    </div>
  );
}
