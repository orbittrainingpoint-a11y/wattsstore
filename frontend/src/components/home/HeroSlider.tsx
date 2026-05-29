'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface HeroSlide {
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  bg: string;
  image: string;
  accent?: string;
}

/** Image-led CMS hero with protected high-contrast copy and keyboard controls. */
export function HeroSlider({ slides, proofPoints = ['Live regional pricing', 'Verified brands', 'RFQ ready', 'Certified ranges'] }: { slides: HeroSlide[]; proofPoints?: string[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setInterval(() => setIdx((current) => (current + 1) % slides.length), 6500);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setIdx((current) => (current - 1 + slides.length) % slides.length);
      if (event.key === 'ArrowRight') setIdx((current) => (current + 1) % slides.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length]);

  const slide = slides[idx];

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className={`relative overflow-hidden text-white transition-colors duration-700 ${slide.bg}`}
    >
      <img src={slide.image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700" />
      <div className="absolute inset-0 bg-[#071321]/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#071321]/95 via-[#071321]/78 to-[#071321]/22" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#071321]/68 via-transparent to-[#071321]/28" />
      <div className="absolute inset-0 grid-lines opacity-10" />

      <div className="container-ws relative flex min-h-[520px] items-center py-16 md:min-h-[610px] md:py-24">
        <div className="fade-up max-w-3xl" key={idx}>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
            <span className={`h-1.5 w-1.5 rounded-full pulse-yellow ${slide.accent ?? 'bg-brand-yellow'}`} />
            {slide.eyebrow}
          </div>
          <h1 className="mt-4 max-w-2xl !text-white text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">{slide.title}</h1>
          <p className="mt-4 max-w-xl text-sm text-white/90 leading-relaxed md:text-base">{slide.sub}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={slide.primary.href} className="btn-yellow btn-lg">{slide.primary.label}<span>-&gt;</span></Link>
            {slide.secondary && <Link href={slide.secondary.href} className="btn-glass btn-lg">{slide.secondary.label}</Link>}
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-white/85">
            {proofPoints.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-brand-yellow" />{item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              aria-label={`Show promotion ${index + 1}`}
              aria-current={index === idx}
              onClick={() => setIdx(index)}
              className={`h-2 rounded-full transition-all duration-500 ${index === idx ? 'bg-brand-yellow w-10' : 'bg-white/55 hover:bg-white w-3'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
