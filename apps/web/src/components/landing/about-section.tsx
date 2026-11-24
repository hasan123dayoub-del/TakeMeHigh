import { HeartHandshake, Map, ReceiptText } from 'lucide-react';
import { AchievementsGrid } from './achievements';
import type { LandingMessages } from './messages';
import { Reveal } from './reveal';
import { SectionHeading } from './section-heading';
import type { PublicSite } from './types';

/** "About us": the office's own words, what it stands for, then its milestones (if any). */
export function AboutSection({ site, t }: { site: PublicSite; t: LandingMessages }) {
  const values = [
    { icon: Map, title: t.aboutValue1, body: t.aboutValue1Body },
    { icon: ReceiptText, title: t.aboutValue2, body: t.aboutValue2Body },
    { icon: HeartHandshake, title: t.aboutValue3, body: t.aboutValue3Body },
  ];
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-24 px-3 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <SectionHeading id="about-title" eyebrow={t.achievementsEyebrow} titleA={t.achievementsTitleA} titleB={t.achievementsTitleB} body={site.office.about || t.achievementsBody} />
        </Reveal>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {values.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <Reveal delay={i * 0.12} className="h-full">
                <div className="group h-full rounded-card border border-border bg-surface-raised p-6 shadow-card transition-[translate,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-pop">
                  <span className="grid size-12 place-items-center rounded-full bg-altitude shadow-primary transition-transform duration-500 ease-out-soft group-hover:-rotate-12 group-hover:scale-110">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-medium">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
        {site.achievements.length > 0 && (
          <>
            <Reveal>
              <h3 className="mt-16 flex items-center gap-3 font-display text-2xl font-medium">
                <span aria-hidden className="h-px w-8 bg-primary/60" />
                {t.achievementsGallery}
              </h3>
            </Reveal>
            <AchievementsGrid items={site.achievements} />
          </>
        )}
      </div>
    </section>
  );
}
