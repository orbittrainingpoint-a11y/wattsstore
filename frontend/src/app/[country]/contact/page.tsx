'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { ILLUSTRATIONS } from '@/lib/images';
import { useRouteParams } from '@/lib/useRouteParams';

export default function ContactPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const [form, setForm] = useState({ name: '', email: '', subject: 'General', message: '' });
  const [sent, setSent] = useState(false);

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <PageHero
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Contact' }]}
        eyebrow="We're listening"
        title="Talk to a human."
        sub="Pre-sales, post-sales, B2B procurement, or engineering questions — we reply within one business hour."
        illustration={ILLUSTRATIONS.contact}
      />

      <section className="container-ws py-14 md:py-20 grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="card p-7">
          {sent ? (
            <div className="text-center py-10">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30">✓</div>
              <h2 className="mt-4 text-2xl font-extrabold">Message sent</h2>
              <p className="mt-2 text-sm text-brand-gray">We'll be back to you within one business hour.</p>
              <Link href={`/${region}`} className="btn-primary mt-6 inline-flex">Continue browsing</Link>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-3">
              <h2 className="text-xl font-extrabold">Send us a message</h2>
              <p className="text-sm text-brand-gray">All fields required.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <input className="input" placeholder="Your name" value={form.name} onChange={upd('name')} required />
                <input className="input" type="email" placeholder="Your email" value={form.email} onChange={upd('email')} required />
              </div>
              <select className="input" value={form.subject} onChange={upd('subject')}>
                <option>General enquiry</option>
                <option>B2B Quote</option>
                <option>Order issue</option>
                <option>Returns / Warranty</option>
                <option>Partnership</option>
              </select>
              <textarea className="input min-h-[140px]" placeholder="Your message" value={form.message} onChange={upd('message')} required />
              <button className="btn-primary btn-lg w-full">Send Message →</button>
              <p className="text-[11px] text-brand-gray text-center">By submitting you agree to our Privacy Policy.</p>
            </form>
          )}
        </div>

        <aside className="space-y-3">
          <div className="card p-5">
            <div className="section-eyebrow">Direct contact</div>
            <div className="mt-3 space-y-3 text-sm">
              <a href="https://wa.me/971500000000" className="flex items-center gap-3 hover:text-brand-blue">
                <img src="/img/social/whatsapp.svg" alt="" className="h-8 w-8" />
                <div><div className="font-semibold">WhatsApp</div><div className="text-xs text-brand-gray">+971 50 000 0000</div></div>
              </a>
              <a href="mailto:hello@wattsstore.com" className="flex items-center gap-3 hover:text-brand-blue">
                <div className="h-8 w-8 rounded-md bg-brand-blue/10 flex items-center justify-center text-brand-blue">✉</div>
                <div><div className="font-semibold">Email</div><div className="text-xs text-brand-gray">hello@wattsstore.com</div></div>
              </a>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-brand-blue/10 flex items-center justify-center text-brand-blue">📍</div>
                <div><div className="font-semibold">Office</div><div className="text-xs text-brand-gray">Dubai Free Zone, UAE</div></div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="section-eyebrow">B2B</div>
            <h3 className="mt-2 font-bold text-base">Need a bulk quote?</h3>
            <p className="mt-1 text-xs text-brand-gray">Submit an RFQ and a sales agent will respond same business day.</p>
            <Link href={`/${region}/quote-basket`} className="btn-yellow btn-sm mt-3 inline-flex">Submit RFQ</Link>
          </div>
          <div className="card p-5">
            <div className="section-eyebrow">Response time</div>
            <p className="mt-2 text-sm">Mon–Fri 09:00–18:00 GST<br/>Sat 10:00–14:00 GST</p>
            <p className="mt-1 text-xs text-brand-gray">Average reply: 17 minutes.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
