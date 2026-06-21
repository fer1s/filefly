import { useRef, useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { classNames } from "../../../shared/utils";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPause,
  faPlay,
  faVolumeHigh,
} from "@fortawesome/free-solid-svg-icons";

import "../../../styles/components/AudioPreview.css";

interface AudioPreviewProps {
  isVisible: boolean;

  filePath: string;
}

const AudioPreview = ({ isVisible, filePath }: AudioPreviewProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVolumeVisible, setIsVolumeVisible] = useState<boolean>(false);

  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(50);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = Number(e.target.value);
    setProgress(Number(e.target.value));
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;

    setProgress(audioRef.current.currentTime);
    setDuration(audioRef.current.duration);
  };

  const handleVolumeButtonClick = () => {
    setIsVolumeVisible((prev) => !prev);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) void audio.play();
    else audio.pause();

    audio.volume = volume / 100;
  }, [filePath, isPlaying, volume]);

  return (
    <div className={classNames("audio_preview", isVisible && "visible")}>
      <audio
        controls
        src={convertFileSrc(filePath)}
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
      />
      <button onClick={togglePlay}>
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
      </button>
      <div className="progress">
        <span className="currentTime">{formatTime(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          value={progress}
          onChange={handleProgress}
        />
        <span className="duration">{formatTime(duration)}</span>
      </div>
      <div className="volume_control">
        <button onClick={handleVolumeButtonClick}>
          <FontAwesomeIcon icon={faVolumeHigh} />
        </button>
        <div
          className={classNames(
            "volume_extension",
            isVolumeVisible && "visible",
          )}
        >
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPreview;

const formatTime = (time: number) => {
  if (time && !isNaN(time)) {
    const minutes = Math.floor(time / 60);
    const formatMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const seconds = Math.floor(time % 60);
    const formatSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${formatMinutes}:${formatSeconds}`;
  }
  return "00:00";
};
