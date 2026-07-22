import { createDefaultChecklistData } from '../../utils/defaultData'

describe('localized default data', () => {
  it('creates simplified Chinese presets for zh-CN', () => {
    const data = createDefaultChecklistData('zh-CN')
    expect(data.daily[0].text).toBe('纳库佩达之池')
    expect(data.daily[0].tags).toEqual(['地图'])
  })

  it('creates English presets for en-US', () => {
    const data = createDefaultChecklistData('en-US')
    expect(data.daily[0].text).toBe("Make a wish at Nacupeda's Pond")
    expect(data.daily[0].tags).toEqual(['Map'])
  })

  it('uses verified NTE terminology in English presets', () => {
    const data = createDefaultChecklistData('en-US')

    expect(data.daily[1].text).toBe("Make a divination at The Witch's House")
    expect(data.daily[2].text).toBe('Pray at Fortune Shades')
    expect(data.daily[3]).toMatchObject({
      text: 'Collect operating revenue from The Cafe by Origen',
      tags: ['City Tycoon'],
    })
    expect(data.daily[4].text).toBe('Gift a Companion Character')
    expect(data.daily[5].text).toContain('City Hangout')
    expect(data.daily[6].text).toBe('Spend Character Pixels')
    expect(data.daily[7].text).toBe('Claim Anomaly Furniture output')
    expect(data.weekly[0].text).toContain('Anomaly Pilgrimage')
    expect(data.weekly[1].text).toBe('Spend City Stamina')
    expect(data.weekly[2].text).toBe('Realm of Greed')
    expect(data.weekly[3].text).toBe('Old Mailbox: Special City Delivery')
    expect(data.weekly[4].text).toBe('Ebisu Auction House')
    expect(data.weekly[5].text).toBe('Circle Bounty: Weekly Quests')
    expect(data.monthly[0].text).toBe('Lost Exchange')
    expect(data.monthly[1].text).toBe('Hunter Exchange')
    expect(data.monthly[2].text).toBe('Otherworld Salvage Station')
  })

  it('does not confuse the Lost Exchange with Origami Market', () => {
    const data = createDefaultChecklistData('en-US')
    expect(data.monthly[0].text).toBe('Lost Exchange')
    expect(data.monthly[0].text).not.toContain('Origami Market')
  })

  it('returns independent data instances', () => {
    const first = createDefaultChecklistData('en-US')
    const second = createDefaultChecklistData('en-US')
    first.daily[0].text = 'Changed'
    expect(second.daily[0].text).not.toBe('Changed')
  })
})
