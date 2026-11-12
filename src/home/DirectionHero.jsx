/* Home hero for the three art directions (?direction=a|b|c). Same copy and CTAs as the default hero (passed in), three compositions.
 * Imagery is procedural (src/home/art): no photographs, no grey placeholders. */
import React from 'react';
import { Scene } from './art/Scenes';
import Swatch from './art/Swatches';

export default function DirectionHero({ dir, eyebrow, title, lede, cta, exploreLabel, Link, finishes = [] }) {
  const actions = (
    <div className="dh-hero__cta">
      <Link to="/booking" className="btn-clay">{cta}</Link>
      <a href="#collections" className="btn-text">{exploreLabel}</a>
    </div>
  );
  if (dir === 'b') {
    return (
      <section className="dh-hero dh-hero--b" aria-label={title}>
        <div className="container dh-hero__grid">
          <div className="dh-hero__copy">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p className="lede">{lede}</p>
            {actions}
            <div className="dh-hero__chips" aria-hidden="true">{finishes.map((f) => <span key={f.id}><Swatch id={f.id} /></span>)}</div>
          </div>
          <figure className="dh-hero__frame" aria-hidden="true">
            <Scene kind="wardrobe" dims fill focus="c" crop="40 10 1120 700" />
            <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
          </figure>
          <figure className="dh-hero__frame2" aria-hidden="true"><Scene kind="door" fill focus="c" crop="300 20 600 700" /></figure>
        </div>
      </section>
    );
  }
  if (dir === 'c') {
    return (
      <section className="dh-hero dh-hero--c" aria-label={title}>
        <div className="container dh-hero__grid">
          <span className="eyebrow dh-hero__eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <div className="dh-hero__plate" aria-hidden="true"><Scene kind="kitchen" fill focus="c" /></div>
          <div className="dh-hero__side">
            <p className="lede">{lede}</p>
            {actions}
          </div>
          <span className="dh-hero__block" aria-hidden="true" />
        </div>
      </section>
    );
  }
  return (
    <section className="dh-hero dh-hero--a" aria-label={title}>
      <div className="dh-hero__art" aria-hidden="true"><Scene kind="wardrobe" fill focus="c" /></div>
      <div className="dh-hero__veil" aria-hidden="true" />
      <div className="container dh-hero__copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
        {actions}
      </div>
    </section>
  );
}
