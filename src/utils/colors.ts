import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'

extend([a11yPlugin])

export const PALETTE = {
  primary: colord('#9080F0').toHex(),
  success: colord('#14AD81').toHex(),
  warning: colord('#E0A030').toHex(),
  info: colord('#15A0B8').toHex(),
  danger: colord('#E85252').toHex(),
}

export const TAG_HEX = [
  colord('#E85252').toHex(),
  colord('#E88030').toHex(),
  colord('#D4A020').toHex(),
  colord('#7CB820').toHex(),
  colord('#22C55E').toHex(),
  colord('#18B0A0').toHex(),
  colord('#6868E8').toHex(),
  colord('#4080E0').toHex(),
  colord('#9850E0').toHex(),
  colord('#D84080').toHex(),
]
