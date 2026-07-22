import { enUS, zhCN } from '../../i18n/resources'

function collectKeys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof child === 'object' && child !== null ? collectKeys(child, path) : [path]
  })
}

describe('translation resources', () => {
  it('keeps English and Chinese translation keys in sync', () => {
    expect(collectKeys(enUS).sort()).toEqual(collectKeys(zhCN).sort())
  })

  it('uses the official English server names for supported regions', () => {
    expect(enUS.settings.server).toMatchObject({
      asia: 'Asia',
      america: 'America',
      europe: 'Europe',
    })
  })

  it('uses concise English reset-schedule wording', () => {
    expect(enUS.settings.server.resetSchedule).toBe(
      'Resets: daily, weekly (Mon), monthly (1st) at {{time}}',
    )
  })

  it('uses the English-client lines matching the Nanally empty-state quotes', () => {
    expect(enUS.checklist).toMatchObject({
      emptySubtitle1: "If you've got nothing to …do, want to hear my grand plan for the family?",
      emptySubtitle2: 'Good morning! Any new commissions? The Coluccis are always good to go!',
      emptySubtitle3: "It's still early. Let's go out for another round.",
    })
  })
})
