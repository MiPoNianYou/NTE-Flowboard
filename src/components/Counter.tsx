import { MotionValue, motion, useSpring, useTransform } from 'motion/react'
import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { SPRING } from '../utils/motion'

type PlaceValue = number | '.'

interface NumberDigitProps {
  motionValue: MotionValue<number>
  digit: number
  height: number
}

function NumberDigit({ motionValue, digit, height }: NumberDigitProps) {
  const yOffset = useTransform(motionValue, (latest) => {
    const placeValue = latest % 10
    const offset = (10 + digit - placeValue) % 10
    let yOffset = offset * height
    if (offset > 5) {
      yOffset -= 10 * height
    }
    return yOffset
  })
  const baseStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  return <motion.span style={{ ...baseStyle, y: yOffset }}>{digit}</motion.span>
}

export function snapToInt(rawValue: number): number {
  const nearest = Math.round(rawValue)
  const tolerance = 1e-9 * Math.max(1, Math.abs(rawValue))
  return Math.abs(rawValue - nearest) < tolerance ? nearest : rawValue
}

export function getRoundedDigit(value: number, place: number): number {
  const scaled = value / place
  return Math.floor(snapToInt(scaled))
}

interface DigitProps {
  place: PlaceValue
  value: number
  height: number
  digitStyle?: CSSProperties
}

function Digit({ place, value, height, digitStyle }: DigitProps) {
  const isDecimal = place === '.'
  const roundedValue = isDecimal ? 0 : getRoundedDigit(value, place)
  const animatedValue = useSpring(roundedValue, SPRING)

  useEffect(() => {
    if (!isDecimal) {
      animatedValue.set(roundedValue)
    }
  }, [animatedValue, roundedValue, isDecimal])

  if (isDecimal) {
    return (
      <span
        className="relative inline-flex items-center justify-center"
        style={{ height, width: 'fit-content', ...digitStyle }}
      >
        .
      </span>
    )
  }

  const defaultStyle: CSSProperties = {
    height,
    position: 'relative',
    width: '1ch',
    fontVariantNumeric: 'tabular-nums',
  }
  return (
    <span
      className="relative inline-flex overflow-hidden"
      style={{ ...defaultStyle, ...digitStyle }}
    >
      {Array.from({ length: 10 }, (_, digitIndex) => (
        <NumberDigit
          key={digitIndex}
          motionValue={animatedValue}
          digit={digitIndex}
          height={height}
        />
      ))}
    </span>
  )
}

export interface CounterProps {
  value: number
  fontSize?: number
  padding?: number
  places?: PlaceValue[]
  gap?: number
  borderRadius?: number
  horizontalPadding?: number
  textColor?: string
  fontWeight?: CSSProperties['fontWeight']
  containerStyle?: CSSProperties
  counterStyle?: CSSProperties
  digitStyle?: CSSProperties
  gradientHeight?: number
  gradientFrom?: string
  gradientTo?: string
  topGradientStyle?: CSSProperties
  bottomGradientStyle?: CSSProperties
  suffix?: string
}

export function Counter({
  value,
  fontSize = 100,
  padding = 0,
  places = [...value.toString()].map((digit, index, digits) => {
    if (digit === '.') {
      return '.'
    }
    const dotIndex = digits.indexOf('.')
    const isInteger = dotIndex === -1
    const exponent = isInteger
      ? digits.length - index - 1
      : index < dotIndex
        ? dotIndex - index - 1
        : -(index - dotIndex)
    return 10 ** exponent
  }),
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = 'inherit',
  fontWeight = 'inherit',
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight = 16,
  gradientFrom = 'var(--color-background)',
  gradientTo = 'transparent',
  topGradientStyle,
  bottomGradientStyle,
  suffix,
}: CounterProps) {
  const height = fontSize + padding
  const defaultContainerStyle: CSSProperties = { position: 'relative', display: 'inline-block' }
  const defaultCounterStyle: CSSProperties = {
    fontSize,
    display: 'flex',
    gap,
    overflow: 'hidden',
    borderRadius,
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    lineHeight: 1,
    color: textColor,
    fontWeight,
    direction: 'ltr',
  }
  const gradientContainerStyle: CSSProperties = {
    pointerEvents: 'none',
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  }
  const defaultTopGradientStyle: CSSProperties = {
    height: gradientHeight,
    background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
  }
  const defaultBottomGradientStyle: CSSProperties = {
    height: gradientHeight,
    background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
  }

  return (
    <span style={{ ...defaultContainerStyle, ...containerStyle }}>
      <span style={{ ...defaultCounterStyle, ...counterStyle }}>
        {places.map((place) => (
          <Digit key={place} place={place} value={value} height={height} digitStyle={digitStyle} />
        ))}
        {suffix && (
          <span style={{ height, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            {suffix}
          </span>
        )}
      </span>
      <span style={gradientContainerStyle}>
        <span style={topGradientStyle ?? defaultTopGradientStyle} />
        <span style={bottomGradientStyle ?? defaultBottomGradientStyle} />
      </span>
    </span>
  )
}
