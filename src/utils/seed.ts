import type {
  ChecklistData,
  ChecklistItem,
  ServerRegion,
  BehaviorSettings,
  UiPreferences,
} from '../types'

export const SERVER_REGIONS: Record<
  ServerRegion,
  { label: string; description: string; abbreviation: string }
> = {
  asia: { label: '亚太服', description: 'UTC+8 (固定)', abbreviation: 'AP' },
  america: { label: '美服', description: 'UTC-5 (EST) / UTC-4 (EDT)', abbreviation: 'US' },
  europe: { label: '欧服', description: 'UTC+1 (CET) / UTC+2 (CEST)', abbreviation: 'EU' },
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
