import { useCallback, useEffect, useRef, useState } from "react"

export interface UseStopwatchOptions {
  autoStart?: boolean
}

export interface UseStopwatchReturn {
  elapsedTime: number
  formattedTime: string
  isRunning: boolean
  start: () => void
  stop: () => void
  reset: () => void
  restart: () => void
}

export function useStopwatch(options: UseStopwatchOptions = {}): UseStopwatchReturn {
  const { autoStart = false } = options

  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [isRunning, setIsRunning] = useState<boolean>(autoStart)

  const startTimeRef = useRef<number | null>(null)
  const accumulatedMsRef = useRef<number>(0)

  const start = useCallback(() => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
    }
    setIsRunning(true)
  }, [])

  const stop = useCallback(() => {
    if (startTimeRef.current !== null) {
      accumulatedMsRef.current += Date.now() - startTimeRef.current
      startTimeRef.current = null
    }
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    startTimeRef.current = null
    accumulatedMsRef.current = 0
    setElapsedTime(0)
    setIsRunning(false)
  }, [])

  const restart = useCallback(() => {
    accumulatedMsRef.current = 0
    startTimeRef.current = Date.now()
    setElapsedTime(0)
    setIsRunning(true)
  }, [])

  useEffect(() => {
    if (!isRunning) return

    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }

    const updateElapsedTime = () => {
      if (startTimeRef.current !== null) {
        const currentDurationMs =
          accumulatedMsRef.current + (Date.now() - startTimeRef.current)
        setElapsedTime(Math.floor(currentDurationMs / 1000))
      }
    }

    // 初回即時反映
    updateElapsedTime()

    const interval = setInterval(updateElapsedTime, 200)

    return () => {
      clearInterval(interval)
    }
  }, [isRunning])

  // 分:秒 のフォーマット
  const minutes = Math.floor(elapsedTime / 60)
  const seconds = elapsedTime % 60
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`

  return {
    elapsedTime,
    formattedTime,
    isRunning,
    start,
    stop,
    reset,
    restart,
  }
}
