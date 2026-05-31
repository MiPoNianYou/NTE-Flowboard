import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

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

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          key="offline"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-amber-500/90 text-white text-xs font-medium shadow-lg flex items-center gap-2 backdrop-blur-sm"
        >
          <WifiOff size={14} />
          <span>离线模式，云同步暂不可用</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
