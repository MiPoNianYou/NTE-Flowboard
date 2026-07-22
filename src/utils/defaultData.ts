import type {
  ChecklistData,
  ChecklistItem,
  ServerRegion,
  BehaviorSettings,
  UiPreferences,
} from '../types'
import type { SupportedLocale } from '../i18n/displayPreferences'

export const SERVER_REGIONS: Record<ServerRegion, { label: string; description: string }> = {
  asia: { label: '亚太服', description: 'UTC+8 (固定)' },
  america: { label: '美服', description: 'UTC-5 (EST) / UTC-4 (EDT)' },
  europe: { label: '欧服', description: 'UTC+1 (CET) / UTC+2 (CEST)' },
}

const defaultDailyItems: ChecklistItem[] = [
  { id: 'd1', text: '纳库佩达之池', isCompleted: false, isHidden: false, order: 1, tags: ['地图'] },
  { id: 'd2', text: '魔女之家占卜', isCompleted: false, isHidden: false, order: 2, tags: ['地图'] },
  { id: 'd3', text: '福荫树木祈愿', isCompleted: false, isHidden: false, order: 3, tags: ['地图'] },
  { id: 'd4', text: '领一咖舍收益', isCompleted: false, isHidden: false, order: 4, tags: ['大亨'] },
  { id: 'd5', text: '赠送角色礼物', isCompleted: false, isHidden: false, order: 5, tags: ['羁遇'] },
  { id: 'd6', text: '角色都市偕游', isCompleted: false, isHidden: false, order: 6, tags: ['羁遇'] },
  { id: 'd7', text: '消耗本性像素', isCompleted: false, isHidden: false, order: 7, tags: ['材料'] },
  { id: 'd8', text: '领取家具产出', isCompleted: false, isHidden: false, order: 8, tags: ['材料'] },
]

const defaultWeeklyItems: ChecklistItem[] = [
  { id: 'w1', text: '异象巡礼周本', isCompleted: false, isHidden: false, order: 1, tags: [] },
  { id: 'w2', text: '消耗都市活力', isCompleted: false, isHidden: false, order: 2, tags: [] },
  { id: 'w3', text: '玛门贪世宝库', isCompleted: false, isHidden: false, order: 3, tags: [] },
  { id: 'w4', text: '老旧邮箱送货', isCompleted: false, isHidden: false, order: 4, tags: [] },
  { id: 'w5', text: '惠比寿拍卖行', isCompleted: false, isHidden: false, order: 5, tags: [] },
  { id: 'w6', text: '通行证周任务', isCompleted: false, isHidden: false, order: 6, tags: [] },
]

const defaultMonthlyItems: ChecklistItem[] = [
  { id: 'm1', text: '集市迷迭兑换', isCompleted: false, isHidden: false, order: 1, tags: ['商城'] },
  { id: 'm2', text: '大亨猎人交易', isCompleted: false, isHidden: false, order: 2, tags: ['商城'] },
  { id: 'm3', text: '玩法异境回收', isCompleted: false, isHidden: false, order: 3, tags: ['商城'] },
]

const defaultEnglishDailyItems: ChecklistItem[] = [
  {
    id: 'd1',
    text: "Make a wish at Nacupeda's Pond",
    isCompleted: false,
    isHidden: false,
    order: 1,
    tags: ['Map'],
  },
  {
    id: 'd2',
    text: "Make a divination at The Witch's House",
    isCompleted: false,
    isHidden: false,
    order: 2,
    tags: ['Map'],
  },
  {
    id: 'd3',
    text: 'Pray at Fortune Shades',
    isCompleted: false,
    isHidden: false,
    order: 3,
    tags: ['Map'],
  },
  {
    id: 'd4',
    text: 'Collect operating revenue from The Cafe by Origen',
    isCompleted: false,
    isHidden: false,
    order: 4,
    tags: ['City Tycoon'],
  },
  {
    id: 'd5',
    text: 'Gift a Companion Character',
    isCompleted: false,
    isHidden: false,
    order: 5,
    tags: ['Bond'],
  },
  {
    id: 'd6',
    text: 'Complete a City Hangout',
    isCompleted: false,
    isHidden: false,
    order: 6,
    tags: ['Bond'],
  },
  {
    id: 'd7',
    text: 'Spend Character Pixels',
    isCompleted: false,
    isHidden: false,
    order: 7,
    tags: ['Materials'],
  },
  {
    id: 'd8',
    text: 'Claim Anomaly Furniture output',
    isCompleted: false,
    isHidden: false,
    order: 8,
    tags: ['Materials'],
  },
]

const defaultEnglishWeeklyItems: ChecklistItem[] = [
  {
    id: 'w1',
    text: 'Complete the weekly Anomaly Pilgrimage',
    isCompleted: false,
    isHidden: false,
    order: 1,
    tags: [],
  },
  {
    id: 'w2',
    text: 'Spend City Stamina',
    isCompleted: false,
    isHidden: false,
    order: 2,
    tags: [],
  },
  {
    id: 'w3',
    text: 'Realm of Greed',
    isCompleted: false,
    isHidden: false,
    order: 3,
    tags: [],
  },
  {
    id: 'w4',
    text: 'Old Mailbox: Special City Delivery',
    isCompleted: false,
    isHidden: false,
    order: 4,
    tags: [],
  },
  {
    id: 'w5',
    text: 'Ebisu Auction House',
    isCompleted: false,
    isHidden: false,
    order: 5,
    tags: [],
  },
  {
    id: 'w6',
    text: 'Circle Bounty: Weekly Quests',
    isCompleted: false,
    isHidden: false,
    order: 6,
    tags: [],
  },
]

const defaultEnglishMonthlyItems: ChecklistItem[] = [
  {
    id: 'm1',
    text: 'Lost Exchange',
    isCompleted: false,
    isHidden: false,
    order: 1,
    tags: ['Shop'],
  },
  {
    id: 'm2',
    text: 'Hunter Exchange',
    isCompleted: false,
    isHidden: false,
    order: 2,
    tags: ['Shop'],
  },
  {
    id: 'm3',
    text: 'Otherworld Salvage Station',
    isCompleted: false,
    isHidden: false,
    order: 3,
    tags: ['Shop'],
  },
]

export const DEFAULT_SETTINGS: BehaviorSettings = {
  serverRegion: 'asia',
  isAutoMoveEnabled: true,
  shouldConfirmDelete: true,
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  cloudPatchHidden: false,
}

export const DEFAULT_CHECKLIST_DATA: ChecklistData = {
  daily: defaultDailyItems,
  weekly: defaultWeeklyItems,
  monthly: defaultMonthlyItems,
  settings: DEFAULT_SETTINGS,
  uiPreferences: DEFAULT_UI_PREFERENCES,
  lastDailyReset: new Date().toISOString(),
  lastWeeklyReset: new Date().toISOString(),
  lastMonthlyReset: new Date().toISOString(),
}

export function createDefaultChecklistData(locale: SupportedLocale): ChecklistData {
  const base =
    locale === 'en-US'
      ? {
          daily: defaultEnglishDailyItems,
          weekly: defaultEnglishWeeklyItems,
          monthly: defaultEnglishMonthlyItems,
        }
      : {
          daily: defaultDailyItems,
          weekly: defaultWeeklyItems,
          monthly: defaultMonthlyItems,
        }

  return {
    daily: structuredClone(base.daily),
    weekly: structuredClone(base.weekly),
    monthly: structuredClone(base.monthly),
    settings: { ...DEFAULT_SETTINGS },
    uiPreferences: { ...DEFAULT_UI_PREFERENCES },
    lastDailyReset: new Date().toISOString(),
    lastWeeklyReset: new Date().toISOString(),
    lastMonthlyReset: new Date().toISOString(),
  }
}
