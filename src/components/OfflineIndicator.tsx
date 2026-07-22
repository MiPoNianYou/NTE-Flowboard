import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { WifiOff, Wifi } from 'lucide-react'
import { SPRING } from '../utils/motion'
import { useTranslation } from 'react-i18next'

export function OfflineIndicator() {
  const { t } = useTranslation()
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const prevIsOffline = useRef(isOffline)
  const [stage, setStage] = useState<'icon' | 'full'>('icon')
  const textRef = useRef<HTMLDivElement>(null)
  const [textWidth, setTextWidth] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (prevIsOffline.current && !isOffline) {
      setIsReconnecting(true)
      const timer = setTimeout(() => setIsReconnecting(false), 2000)
      return () => clearTimeout(timer)
    }
    prevIsOffline.current = isOffline
  }, [isOffline])

  useEffect(() => {
    if (isOffline) {
      if (isReconnecting) {
        setStage('full')
      } else {
        setStage('icon')
        setTextWidth(0)
        const timer = setTimeout(() => setStage('full'), 800)
        return () => clearTimeout(timer)
      }
    } else if (isReconnecting) {
      setStage('full')
    } else {
      setStage('icon')
    }
  }, [isOffline, isReconnecting])

  useEffect(() => {
    if (stage === 'full' && textRef.current) {
      setTextWidth(textRef.current.scrollWidth)
    }
  }, [stage])

  return (
    <AnimatePresence>
      {(isOffline || isReconnecting || (prevIsOffline.current && !isOffline)) && (
        <motion.div
          key="offline"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0, transition: { delay: 0.8, ...SPRING } }}
          transition={SPRING}
          className="shrink-0 w-fit overflow-hidden whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
          style={{
            background: 'var(--color-glass)',
            border: '1px solid var(--color-glass-border)',
            color: isOffline ? 'var(--color-warning)' : 'var(--color-success)',
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={SPRING}
            exit={{ scale: 0, transition: { delay: 0.8, ...SPRING } }}
          >
            {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
          </motion.div>
          <motion.div
            ref={textRef}
            className="min-w-0"
            initial={{ opacity: 0, width: 0 }}
            animate={
              stage === 'full'
                ? { opacity: 1, width: textWidth || 'auto' }
                : { opacity: 0, width: 0 }
            }
            transition={SPRING}
            exit={{ opacity: 0, width: 0, transition: { delay: 0, ...SPRING } }}
          >
            {isOffline ? t('offline.offline') : t('offline.restored')}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
