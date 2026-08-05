import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { SCALE_ENTRY, SCALE_EXIT } from '../../utils/motion'
import { Cloud, Eye, EyeOff, ChevronRight, ChevronDown, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from '../base/Button'
import { Input } from '../base/Input'
import { Card } from '../base/Card'
import { SqlCodeBlock } from './SqlCodeBlock'
import type { CloudSynchronizationCommandResult } from '../../utils/cloudSynchronization'
import { CONDITIONAL_SYNC_SQL } from '../../utils/cloudSyncSql'

function ConnectButtonLabel({ children }: { children: ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, transition: SCALE_EXIT }}
      transition={SCALE_ENTRY}
      className="inline-flex items-center gap-1.5"
    >
      {children}
    </motion.span>
  )
}

function buildSqlSnippet(t: TFunction) {
  return `-- ${t('cloud.sql.title')}
-- ${t('cloud.sql.instructions')}

-- 1. ${t('cloud.sql.createTable')}
CREATE TABLE sync_data (
  id TEXT PRIMARY KEY DEFAULT 'NTE Flowboard',
  data TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ${t('cloud.sql.enableRls')}
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

-- 3. ${t('cloud.sql.createPolicy')}
CREATE POLICY "Allow RPC" ON sync_data
  FOR ALL USING (true)
  WITH CHECK (true);

-- 4. ${t('cloud.sql.pushFunction')}
CREATE OR REPLACE FUNCTION upsert_sync(p_data TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE sql SECURITY DEFINER
AS $$
  INSERT INTO sync_data (id, data, updated_at)
  VALUES ('NTE Flowboard', p_data, now())
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    updated_at = EXCLUDED.updated_at
  RETURNING updated_at;
$$;

-- 5. ${t('cloud.sql.conditionalPushFunction')}
${CONDITIONAL_SYNC_SQL}

-- 6. ${t('cloud.sql.pullFunction')}
CREATE OR REPLACE FUNCTION pull_sync()
RETURNS TABLE(data TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT data, updated_at FROM sync_data WHERE id = 'NTE Flowboard';
$$;

-- 7. ${t('cloud.sql.updatedAt')}
CREATE OR REPLACE FUNCTION set_sync_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_data_set_updated_at ON sync_data;
CREATE TRIGGER sync_data_set_updated_at
  BEFORE UPDATE ON sync_data
  FOR EACH ROW
  EXECUTE FUNCTION set_sync_updated_at();

-- 8. ${t('cloud.sql.realtime')}
ALTER PUBLICATION supabase_realtime ADD TABLE sync_data;`
}

interface CloudSyncSetupProps {
  onSetupSupabase: (
    projectUrl: string,
    anonKey: string,
  ) => Promise<CloudSynchronizationCommandResult>
  mobile?: boolean
}

type ButtonPhase = 'idle' | 'loading' | 'error'

export function CloudSyncSetup({ onSetupSupabase, mobile = false }: CloudSyncSetupProps) {
  const { t } = useTranslation()
  const sqlSnippet = useMemo(() => buildSqlSnippet(t), [t])
  const [projectUrlInput, setProjectUrlInput] = useState('')
  const [anonKeyInput, setAnonKeyInput] = useState('')
  const [isAnonKeyVisible, setIsAnonKeyVisible] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSetupGuideExpanded, setIsSetupGuideExpanded] = useState(false)
  const setupGuideContentId = useId()
  const [buttonPhase, setButtonPhase] = useState<ButtonPhase>('idle')
  const [buttonErrorMessage, setButtonErrorMessage] = useState<string | null>(null)
  const [isMarqueeNeeded, setIsMarqueeNeeded] = useState(false)
  const [marqueeDistance, setMarqueeDistance] = useState(0)
  const [shouldStartMarquee, setShouldStartMarquee] = useState(false)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const marqueeStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const marqueeViewportRef = useRef<HTMLSpanElement | null>(null)
  const marqueeTrackRef = useRef<HTMLSpanElement | null>(null)

  const showSetupError = (errorMessage: string) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }

    setButtonErrorMessage(errorMessage)
    setButtonPhase('error')
    feedbackTimerRef.current = setTimeout(() => {
      setButtonErrorMessage(null)
      setButtonPhase('idle')
      feedbackTimerRef.current = null
    }, 2000)
  }

  const clearButtonFeedback = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
    if (marqueeStartTimerRef.current) {
      clearTimeout(marqueeStartTimerRef.current)
      marqueeStartTimerRef.current = null
    }
    setButtonErrorMessage(null)
    setButtonPhase('idle')
    setIsMarqueeNeeded(false)
    setMarqueeDistance(0)
    setShouldStartMarquee(false)
  }

  useEffect(() => {
    if (!buttonErrorMessage) {
      if (marqueeStartTimerRef.current) {
        clearTimeout(marqueeStartTimerRef.current)
        marqueeStartTimerRef.current = null
      }
      setIsMarqueeNeeded(false)
      setMarqueeDistance(0)
      setShouldStartMarquee(false)
      return
    }

    const measureOverflow = () => {
      const viewport = marqueeViewportRef.current
      const track = marqueeTrackRef.current
      if (!viewport || !track) return

      const overflow = track.scrollWidth - viewport.clientWidth
      if (overflow > 8) {
        setIsMarqueeNeeded(true)
        setMarqueeDistance(overflow)
        setShouldStartMarquee(false)
        if (marqueeStartTimerRef.current) clearTimeout(marqueeStartTimerRef.current)
        marqueeStartTimerRef.current = setTimeout(() => {
          setShouldStartMarquee(true)
          marqueeStartTimerRef.current = null
        }, 260)
      } else {
        setIsMarqueeNeeded(false)
        setMarqueeDistance(0)
        setShouldStartMarquee(false)
      }
    }

    measureOverflow()

    const resizeObserver = new ResizeObserver(() => {
      measureOverflow()
    })

    if (marqueeViewportRef.current) resizeObserver.observe(marqueeViewportRef.current)
    if (marqueeTrackRef.current) resizeObserver.observe(marqueeTrackRef.current)

    return () => {
      resizeObserver.disconnect()
      if (marqueeStartTimerRef.current) {
        clearTimeout(marqueeStartTimerRef.current)
        marqueeStartTimerRef.current = null
      }
    }
  }, [buttonErrorMessage])

  const handleSetup = async () => {
    if (buttonPhase !== 'idle' || !projectUrlInput.trim() || !anonKeyInput.trim()) return
    clearButtonFeedback()
    setIsConnecting(true)
    setButtonPhase('loading')
    const start = Date.now()
    try {
      const result = await onSetupSupabase(projectUrlInput.trim(), anonKeyInput.trim())
      if (result.ok) {
        setButtonPhase('idle')
      } else {
        showSetupError(result.error)
      }
    } catch {
      showSetupError(t('sync.setupUnknown'))
    } finally {
      const elapsed = Date.now() - start
      if (elapsed < 500) await new Promise((resolve) => setTimeout(resolve, 500 - elapsed))
      setIsConnecting(false)
    }
  }

  return (
    <div className="space-y-4">
      {!mobile && (
        <Card variant="surface" className="px-4 py-3">
          <p className="text-sm font-medium text-text-primary">{t('cloud.description')}</p>
        </Card>
      )}

      <Card
        variant="surface"
        disableHoverScale={mobile}
        className={cn('px-4 py-3', mobile && 'mobile-settings-surface')}
      >
        <div className="space-y-3">
          <Input
            label="Project URL"
            type="url"
            value={projectUrlInput}
            onChange={(event) => {
              clearButtonFeedback()
              setProjectUrlInput(event.target.value)
            }}
            placeholder="https://xxx.supabase.co"
            autoComplete="off"
          />
          <Input
            label="Publishable Key"
            type={isAnonKeyVisible ? 'text' : 'password'}
            value={anonKeyInput}
            onChange={(event) => {
              clearButtonFeedback()
              setAnonKeyInput(event.target.value)
            }}
            placeholder="sb_publishable_..."
            autoComplete="off"
            suffix={
              <button
                type="button"
                onClick={() => setIsAnonKeyVisible((prev) => !prev)}
                aria-label={isAnonKeyVisible ? t('cloud.hideKey') : t('cloud.showKey')}
                className="p-0 text-text-muted hover:text-text-primary transition-colors duration-200"
              >
                {isAnonKeyVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            }
          />
        </div>
        <Button
          onClick={handleSetup}
          disabled={isConnecting || !projectUrlInput.trim() || !anonKeyInput.trim()}
          aria-disabled={buttonPhase !== 'idle' || !projectUrlInput.trim() || !anonKeyInput.trim()}
          tabIndex={buttonPhase === 'error' ? -1 : undefined}
          variant={buttonPhase === 'error' ? 'danger-soft' : 'primary'}
          className={cn(
            'mt-3 w-full justify-center hover:brightness-100 hover:shadow-md',
            buttonPhase === 'error' &&
              'cursor-not-allowed hover:bg-danger/10 hover:text-danger hover:brightness-100',
          )}
          contentClassName={
            buttonPhase === 'error' ? 'w-full justify-center overflow-hidden' : undefined
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            {buttonPhase === 'loading' ? (
              <ConnectButtonLabel key="loading-label">
                <Loader2 className="size-3.5 animate-spin" />
                <span>{t('cloud.connecting')}</span>
              </ConnectButtonLabel>
            ) : buttonPhase === 'error' && buttonErrorMessage ? (
              <motion.span
                key={buttonErrorMessage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: SCALE_EXIT }}
                transition={SCALE_ENTRY}
                className="block w-full"
              >
                <span
                  ref={marqueeViewportRef}
                  className="relative block w-full overflow-hidden whitespace-nowrap"
                >
                  <motion.span
                    ref={marqueeTrackRef}
                    animate={
                      isMarqueeNeeded && shouldStartMarquee
                        ? { x: [0, -marqueeDistance] }
                        : { x: 0 }
                    }
                    transition={
                      isMarqueeNeeded && shouldStartMarquee
                        ? {
                            x: {
                              duration: Math.max(1.8, marqueeDistance / 36),
                              ease: 'linear',
                              repeat: Infinity,
                              repeatType: 'reverse',
                              repeatDelay: 0.35,
                              delay: 0.25,
                            },
                          }
                        : undefined
                    }
                    className={cn(
                      'inline-block text-sm leading-snug',
                      isMarqueeNeeded && shouldStartMarquee ? 'text-left' : 'w-full text-center',
                    )}
                  >
                    {buttonErrorMessage}
                  </motion.span>
                </span>
              </motion.span>
            ) : (
              <ConnectButtonLabel key="connect-label">
                <Cloud className="size-3.5" />
                <span>{t('cloud.connect')}</span>
              </ConnectButtonLabel>
            )}
          </AnimatePresence>
        </Button>
      </Card>

      <Card
        variant="surface"
        disableHoverScale={mobile}
        className={cn(
          'px-4 text-xs leading-relaxed text-text-secondary',
          mobile ? 'py-0' : 'space-y-3 py-3',
          mobile && 'mobile-settings-surface',
        )}
      >
        {mobile && (
          <button
            type="button"
            onClick={() => setIsSetupGuideExpanded((expanded) => !expanded)}
            aria-expanded={isSetupGuideExpanded}
            aria-controls={setupGuideContentId}
            className="flex min-h-14 w-full items-center justify-between gap-3 text-left text-text-primary"
          >
            <span className="text-sm font-semibold">{t('cloud.setupGuide')}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-4 flex-shrink-0 transition-transform duration-150',
                !isSetupGuideExpanded && '-rotate-90',
              )}
            />
          </button>
        )}
        <div
          id={setupGuideContentId}
          className={cn(
            'space-y-3',
            mobile && !isSetupGuideExpanded && 'hidden',
            mobile && isSetupGuideExpanded && 'mobile-settings-divider py-3',
          )}
        >
          <div>
            <p className="text-sm font-semibold text-text-primary mb-1">
              {t('cloud.setupProjectTitle')}
            </p>
            <p>
              {t('cloud.setupProjectBeforeLink')}{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors duration-200"
              >
                supabase.com
                <ExternalLink className="size-3" />
              </a>{' '}
              {t('cloud.setupProjectAfterLink')}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary mb-1">
              {t('cloud.setupTableTitle')}
            </p>
            <p className="mb-2">{t('cloud.setupTableDescription')}</p>
            <SqlCodeBlock
              label={t('cloud.setupSqlLabel')}
              copyLabel={t('cloud.copySql')}
              content={sqlSnippet}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary mb-1">
              {t('cloud.setupCredentialsTitle')}
            </p>
            <div className="flex items-center gap-1 text-xs text-text-secondary flex-wrap">
              <Path>{t('cloud.dashboardHome')}</Path>
              <ChevronRight className="size-3 text-text-muted" />
              <Path>Copy</Path>
              <ChevronRight className="size-3 text-text-muted" />
              <Path>Project URL</Path>
              <span>{t('cloud.conjunction')}</span>
              <Path>Publishable key</Path>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary mb-1">
              {t('cloud.setupFinishTitle')}
            </p>
            <p>{t('cloud.setupFinishDescription')}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Path({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-compact bg-elevated text-xs font-mono text-text-primary border border-border">
      {children}
    </span>
  )
}
