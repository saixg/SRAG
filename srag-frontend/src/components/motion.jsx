/*
  The app's whole motion vocabulary, in one file.

  Each primitive exists because something in the product needs to be understood,
  not because the page needed decoration:

  - Reveal: trust-trace steps, citation chips and quick actions arrive in order.
    Showing them appear in that order is the honest rendering of a sequence that
    really is sequential. Instant appearance reads as a list that was always there.
  - FadeIn: acknowledges that a route's content is new.

  Implemented in CSS rather than with an animation library. At this intensity the
  whole vocabulary is a fade, an 8px rise and a stagger, which CSS does natively
  with `animation-delay`; the library that would express the same thing cost
  124 kB of JavaScript, which is not a trade worth making on a tool whose job is
  to answer a question quickly.

  Nothing loops. Nothing parallaxes. Nothing hijacks scroll. Only `opacity` and
  `transform` are animated, and `@media (prefers-reduced-motion: reduce)` in
  index.css collapses every one of them to its final state.
*/

/** A number of steps worth staggering. Past this the delay becomes a wait. */
const MAX_STAGGER = 8

export function Reveal({ children, index = 0, as: Tag = 'div', className = '', style, ...rest }) {
  return (
    <Tag
      className={`srag-reveal ${className}`.trim()}
      style={{ '--srag-i': Math.min(index, MAX_STAGGER), ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function FadeIn({ children, as: Tag = 'div', className = '', style, ...rest }) {
  return (
    <Tag className={`srag-fade ${className}`.trim()} style={style} {...rest}>
      {children}
    </Tag>
  )
}
