import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { convertFileSrc } from '@tauri-apps/api/tauri'

import { IoPlay, IoPause, IoVolumeMedium } from 'react-icons/io5'

import '../styles/components/AudioPreview.scss'

const audioPreviewVariants = {
   hidden: {
      opacity: 0,
      scale: 0.6,
      y: '100%',
      translateX: '-50%',
   },
   visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      translateX: '-50%',
   },
}

const volumeControlVariants = {
   hidden: {
      opacity: 0,
      scale: 0.6,
      x: '100%',
      translateX: '-50%',
   },
   visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      translateX: '-50%',
   },
}

interface AudioPreviewProps {
   isVisible: boolean

   filePath: string
}

const AudioPreview = ({ isVisible, filePath }: AudioPreviewProps) => {
   const audioRef = useRef<HTMLAudioElement>(null)

   const [isPlaying, setIsPlaying] = useState<boolean>(false)
   const [isVolumeVisible, setIsVolumeVisible] = useState<boolean>(false)

   const [progress, setProgress] = useState<number>(0)
   const [duration, setDuration] = useState<number>(0)
   const [volume, setVolume] = useState<number>(50)

   const togglePlay = () => {
      setIsPlaying((prev) => !prev)
   }

   const handlePlay = () => {
      if (!audioRef.current) return

      if (isPlaying) {
         audioRef.current.play()
      } else {
         audioRef.current.pause()
      }
   }

   const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!audioRef.current) return

      audioRef.current.currentTime = Number(e.target.value)
      setProgress(Number(e.target.value))
   }

   const handleTimeUpdate = () => {
      if (!audioRef.current) return

      setProgress(audioRef.current.currentTime)
      setDuration(audioRef.current.duration)
   }

   const handleVolumeChange = () => {
      if (!audioRef.current) return

      audioRef.current.volume = volume / 100
   }

   const handleVolumeButtonClick = () => {
      setIsVolumeVisible((prev) => !prev)
   }

   useEffect(() => {
      handlePlay()
      handleVolumeChange()
   }, [isPlaying, volume, audioRef, filePath])

   useEffect(() => {
      if (!audioRef.current) return

      audioRef.current.addEventListener('timeupdate', handleTimeUpdate)

      return () => {
         if (!audioRef.current) return
         audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
      }
   }, [audioRef])

   useEffect(() => {
      if(!isVisible) {
         setIsPlaying(false)
         setIsVolumeVisible(false)
      }
   }, [isVisible])

   return (
      <motion.div className="audio_preview"
         variants={audioPreviewVariants}
         initial="hidden"
         animate={isVisible ? 'visible' : 'hidden'}
      >
         <audio controls src={convertFileSrc(filePath)} ref={audioRef} />
         <button onClick={togglePlay}>{isPlaying ? <IoPause /> : <IoPlay />}</button>
         <div className="progress">
            <span className="currentTime">{formatTime(progress)}</span>
            <input type="range" min={0} max={duration} value={progress} onChange={handleProgress} />
            <span className="duration">{formatTime(duration)}</span>
         </div>
         <div className="volume_control">
            <button
               onClick={handleVolumeButtonClick}
            >
               <IoVolumeMedium />
            </button>
            <motion.div className="volume_extension"
               variants={volumeControlVariants}
               initial="hidden"
               animate={isVolumeVisible ? 'visible' : 'hidden'}
               transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            >
               <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
            </motion.div>
         </div>
      </motion.div>
   )
}

export default AudioPreview

const formatTime = (time: number) => {
   if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60)
      const formatMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`
      const seconds = Math.floor(time % 60)
      const formatSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`
      return `${formatMinutes}:${formatSeconds}`
   }
   return '00:00'
}
