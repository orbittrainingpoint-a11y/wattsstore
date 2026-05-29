import Link from 'next/link';
import { ILLUSTRATIONS } from '@/lib/images';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <span className="blob h-72 w-72 -top-10 left-1/4 bg-brand-blue/20" />
      <span className="blob h-72 w-72 bottom-0 right-1/4 bg-brand-yellow/30" />
      <div className="relative card p-8 md:p-10 text-center max-w-xl w-full">
        <img src={ILLUSTRATIONS.notFound} alt="" className="mx-auto w-full max-w-sm" />
        <h1 className="mt-5 text-2xl md:text-3xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-sm text-brand-gray max-w-md mx-auto">
          The page you're looking for doesn't exist or was moved. Try searching the catalog or jump to a popular section.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/ae" className="btn-primary">Go to homepage</Link>
          <Link href="/ae/search?q=" className="btn-outline">Search the catalog</Link>
        </div>
        <div className="mt-7 text-xs text-brand-gray">
          Common links · <Link href="/ae/categories/industrial-lighting" className="text-brand-blue font-semibold link-underline">Industrial Lighting</Link> · <Link href="/ae/categories/solar-equipment" className="text-brand-blue font-semibold link-underline">Solar</Link> · <Link href="/ae/contact" className="text-brand-blue font-semibold link-underline">Contact</Link>
        </div>
      </div>
    </div>
  );
}
