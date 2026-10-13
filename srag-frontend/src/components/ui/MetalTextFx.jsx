import { MetalText } from 'metal-fx'
import { useTheme } from '../../lib/useTheme'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

/*
  metal-fx's <MetalText>: the metal lives inside the glyphs instead of in a
  ring around a box. Same two deviations from the vendor defaults as
  MetalButton -- theme driven from this app's own toggle rather than the OS,
  and reduced motion honored -- but the second one has to be handled
  differently here.

  MetalText has no `paused` prop (only MetalFx does), so there is no way to
  freeze it on a frame. Under reduced motion it therefore renders the plain
  text in the same colour, font and metrics instead. Nothing is lost: unlike
  a spinner, whose ring still carries meaning when still, the metal inside a
  wordmark is pure decoration -- the word is the content.

  `font` is a CSS `font` shorthand and is required by the library, which
  paints the glyphs itself onto a canvas; it has to match what the
  surrounding DOM would have rendered or the metal lands off the letterforms.
  Callers pass it from the same tokens the plain text would have used.
*/
function MetalTextFx({ children, font, color, fallbackStyle, ...fxProps }) {
  const { resolved } = useTheme()
  const reducedMotion = usePrefersReducedMotion()

  if (reducedMotion) {
    return <span style={{ font, color, ...fallbackStyle }}>{children}</span>
  }

  return (
    <MetalText
      font={font}
      color={color}
      theme={resolved}
      // The inner-shadow rim is a second canvas painting of the same glyphs,
      // and on a 2x display it lands a few device pixels off the DOM text --
      // which reads as a ghosted duplicate of the word, not as a rim. The
      // metal inside the letterforms is the effect; the rim is a highlight on
      // top of it, so it is the part that goes.
      innerShadow={null}
      // The metal is painted on its own canvas and stretched to the text's
      // fractional CSS width, so on a 2x display it sits up to a device pixel
      // off the DOM glyphs underneath. Held below the library's default, it
      // reads as a sheen on the letterforms rather than as a second copy of
      // the word showing through.
      metalOpacity={0.5}
      {...fxProps}
    >
      {children}
    </MetalText>
  )
}

/* Default export so callers can lazy() the shader out of the main bundle. */
export default MetalTextFx
