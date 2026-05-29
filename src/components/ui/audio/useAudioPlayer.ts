"use client";

import * as React from "react";

interface AudioTrack {
  name: string;
  url: string;
  artist?: string;
  album?: string;
  sampleRate?: string;
  bitrate?: string;
  channels?: string;
  format?: string;
  cover?: string | null;
}

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const progressBarRef = React.useRef<HTMLDivElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playTrack = (track: AudioTrack) => {
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      setCurrentTime(time);
      setDuration(dur);
      setProgress(dur > 0 ? (time / dur) * 100 : 0);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    audioRef.current.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
    setProgress(percentage * 100);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    progress,
    audioRef,
    progressBarRef,
    togglePlay,
    playTrack,
    onTimeUpdate,
    onLoadedMetadata,
    handleSeek,
    formatTime
  };
}
