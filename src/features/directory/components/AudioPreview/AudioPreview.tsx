import { useRef, useState, useEffect, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import IconButton, {
  ICON_BUTTON_SIZE,
} from "@/shared/components/elements/IconButton";
import Slider from "@/shared/components/elements/Slider";
import {
  SPACE_HOTKEY,
  useHotkey,
  useHotkeyScope,
  HOTKEY_SCOPE,
} from "@/shared/keymap";
import { classNames } from "@/shared/utils";
import { KEY } from "@/shared/constants";
import { t } from "@/lang";

import {
  faPause,
  faPlay,
  faVolumeHigh,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/AudioPreview.css";

import { DEFAULT_VOLUME } from "./constants";
import { formatTime } from "./utils";
import type { AudioPreviewProps } from "./types";

const AudioPreview = ({ isVisible, filePath }: AudioPreviewProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVolumeVisible, setIsVolumeVisible] = useState<boolean>(false);

  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(DEFAULT_VOLUME);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

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

  // Space toggles play/pause while the preview is open (universal media convention). Runs in the
  // PREVIEW scope; the dispatcher's input guard ignores it while typing and preventDefault stops
  // the page from scrolling on Space.
  useHotkeyScope(HOTKEY_SCOPE.PREVIEW, isVisible);
  useHotkey({ keys: [KEY.SPACE] }, togglePlay, {
    scope: HOTKEY_SCOPE.PREVIEW,
    when: isVisible,
  });

  return (
    <div className={classNames("audio_preview", isVisible && "visible")}>
      <audio
        controls
        src={convertFileSrc(filePath)}
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
      />
      <IconButton
        icon={isPlaying ? faPause : faPlay}
        size={ICON_BUTTON_SIZE.LG}
        tooltip={isPlaying ? t.common.pause : t.common.play}
        hotkey={SPACE_HOTKEY}
        onClick={togglePlay}
      />
      <div className="progress">
        <span className="currentTime">{formatTime(progress)}</span>
        <Slider
          min={0}
          max={duration}
          value={progress}
          onChange={handleProgress}
        />
        <span className="duration">{formatTime(duration)}</span>
      </div>
      <div className="volume_control">
        <IconButton
          icon={faVolumeHigh}
          size={ICON_BUTTON_SIZE.LG}
          onClick={handleVolumeButtonClick}
        />
        <div
          className={classNames(
            "volume_extension",
            isVolumeVisible && "visible",
          )}
        >
          <Slider
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
