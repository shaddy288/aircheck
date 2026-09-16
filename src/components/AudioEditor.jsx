import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

/*
 * Slice an AudioBuffer down to [start, end] seconds,
 * copying only the samples in that window per channel.
 */
function sliceAudioBuffer(audioBuffer, start, end) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContextClass();

  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.max(0, Math.floor(start * sampleRate));
  const endSample = Math.min(audioBuffer.length, Math.floor(end * sampleRate));
  const frameCount = Math.max(0, endSample - startSample);

  const slicedBuffer = audioCtx.createBuffer(
    audioBuffer.numberOfChannels,
    frameCount || 1,
    sampleRate,
  );

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer
      .getChannelData(channel)
      .subarray(startSample, endSample);

    slicedBuffer.copyToChannel(channelData, channel, 0);
  }

  audioCtx.close();

  return slicedBuffer;
}

function floatTo16BitPCM(floatArray) {
  const output = new Int16Array(floatArray.length);

  for (let i = 0; i < floatArray.length; i++) {
    const sample = Math.max(-1, Math.min(1, floatArray[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

/*
 * Encode an AudioBuffer as an MP3 Blob using @breezystack/lamejs
 * (a browser-safe fork of lamejs — the original references Node's
 * `global` and breaks under webpack 5 / Next.js). Loaded dynamically
 * so the encoder only enters the bundle when a cut actually happens.
 */
async function audioBufferToMp3Blob(buffer, bitRateKbps = 128) {
  const { Mp3Encoder } = await import("@breezystack/lamejs");

  const numChannels = Math.min(buffer.numberOfChannels, 2);
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(numChannels, sampleRate, bitRateKbps);

  const left = floatTo16BitPCM(buffer.getChannelData(0));
  const right =
    numChannels === 2 ? floatTo16BitPCM(buffer.getChannelData(1)) : null;

  const sampleBlockSize = 1152; // required block size for lamejs
  const mp3Chunks = [];

  for (let i = 0; i < left.length; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize);

    const mp3buf = right
      ? encoder.encodeBuffer(leftChunk, right.subarray(i, i + sampleBlockSize))
      : encoder.encodeBuffer(leftChunk);

    if (mp3buf.length > 0) {
      mp3Chunks.push(mp3buf);
    }
  }

  const finalChunk = encoder.flush();

  if (finalChunk.length > 0) {
    mp3Chunks.push(finalChunk);
  }

  return new Blob(mp3Chunks, { type: "audio/mpeg" });
}

function triggerDownload(blob, downloadName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/*
 * Builds the small floating time labels shown at the region's
 * start and end handles, plus an updater to keep them in sync
 * while the user drags/resizes the selection.
 */
function createRegionLabels() {
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.inset = "0";
  wrapper.style.pointerEvents = "none";

  const labelStyle = {
    position: "absolute",
    top: "2px",
    fontSize: "10px",
    fontFamily: "monospace",
    color: "#1f2a2e",
    background: "rgba(255, 255, 255, 0.9)",
    padding: "1px 4px",
    borderRadius: "3px",
    border: "1px solid rgba(31, 42, 46, 0.15)",
    whiteSpace: "nowrap",
  };

  const startLabel = document.createElement("span");
  Object.assign(startLabel.style, labelStyle, { left: "2px" });

  const endLabel = document.createElement("span");
  Object.assign(endLabel.style, labelStyle, {
    right: "2px",
    transform: "translateX(0)",
  });

  wrapper.appendChild(startLabel);
  wrapper.appendChild(endLabel);

  const update = (start, end) => {
    startLabel.textContent = formatTime(start);
    endLabel.textContent = formatTime(end);
  };

  return { element: wrapper, update };
}

export default function AudioEditor({ audioUrl, fileName, onCutDownload }) {
  const containerRef = useRef(null);
  const waveSurferRef = useRef(null);
  const regionRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [selection, setSelection] = useState({
    start: 0,
    end: 0,
  });

  const [isCutting, setIsCutting] = useState(false);
  const [cutError, setCutError] = useState(null);

  /*
   * Secondary safety net: suppress the browser's own console
   * warning for any other stray AbortError rejections. Note this
   * does NOT stop Next's dev overlay from showing them (it has its
   * own separate listener), which is why the effect below defers
   * destroy() until loading has actually settled — that's the
   * real fix for the "signal is aborted without reason" error.
   */
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      if (event.reason?.name === "AbortError") {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    // Tracks whether the audio has finished loading, and whether
    // cleanup ran before that happened.
    let isReady = false;
    let pendingDestroy = false;

    const regions = RegionsPlugin.create();

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      height: 110,
      waveColor: "#344e49",
      progressColor: "#3dd6a0",
      cursorColor: "#ef4444",
      cursorWidth: 2,
      normalize: true,
      barWidth: 1,
      barGap: 1,
      barRadius: 1,
      minPxPerSec: 1,
      plugins: [regions],
    });

    waveSurferRef.current = wavesurfer;

    /*
     * WaveSurfer loads audio via fetch() with an internal
     * AbortController, and destroy() aborts that fetch. If the
     * fetch is still in flight — e.g. under React dev mode's
     * effect double-invoke (mount -> cleanup -> mount) — that
     * abort rejects a promise deep inside the library itself,
     * outside any try/catch we could write here, surfacing as
     * "AbortError: signal is aborted without reason". The fix is
     * to simply not destroy() until loading has actually finished
     * (or failed), so there's never an in-flight fetch to abort.
     */
    const destroyNow = () => {
      try {
        wavesurfer.destroy();
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error destroying WaveSurfer instance:", err);
        }
      }
    };

    wavesurfer.load(audioUrl);

    const regionLabels = createRegionLabels();

    wavesurfer.on("ready", () => {
      isReady = true;

      const total = wavesurfer.getDuration();

      setDuration(total);

      /*
       * Initial selection:
       * 15% -> 85% of audio
       */
      const start = total * 0.15;
      const end = total * 0.85;

      const region = regions.addRegion({
        start,
        end,
        color: "rgba(61, 214, 160, 0.18)",
        drag: true,
        resize: true,
        content: regionLabels.element,
      });

      regionRef.current = region;

      regionLabels.update(start, end);
      setSelection({ start, end });

      if (pendingDestroy) {
        destroyNow();
      }
    });

    /*
     * Live time labels on the region's start/end handles while
     * the user is actively dragging or resizing.
     */
    regions.on("region-update", (region) => {
      regionLabels.update(region.start, region.end);
    });

    /*
     * Update selected section when
     * user drags/resizes handles
     */
    regions.on("region-updated", (region) => {
      regionLabels.update(region.start, region.end);

      setSelection({
        start: region.start,
        end: region.end,
      });
    });

    /*
     * Clicking region starts playback
     */
    regions.on("region-clicked", (region, event) => {
      event.stopPropagation();
      region.play();
    });

    wavesurfer.on("timeupdate", (time) => {
      setCurrentTime(time);

      /*
       * Stop when selected region ends
       */
      if (
        regionRef.current &&
        time >= regionRef.current.end &&
        wavesurfer.isPlaying()
      ) {
        wavesurfer.pause();
        wavesurfer.setTime(regionRef.current.start);
      }
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => setIsPlaying(false));

    wavesurfer.on("error", (err) => {
      isReady = true; // loading has settled (with an error) — safe to destroy

      if (err?.name !== "AbortError") {
        console.error("WaveSurfer error:", err);
      }

      if (pendingDestroy) {
        destroyNow();
      }
    });

    return () => {
      if (isReady) {
        destroyNow();
      } else {
        // Audio is still loading — don't abort it. destroyNow()
        // runs once "ready" or "error" fires above instead.
        pendingDestroy = true;
      }

      waveSurferRef.current = null;
      regionRef.current = null;
    };
  }, [audioUrl]);

  /*
   * Play only selected audio
   */
  const handlePlay = () => {
    const wavesurfer = waveSurferRef.current;
    const region = regionRef.current;

    if (!wavesurfer || !region) return;

    if (wavesurfer.isPlaying()) {
      wavesurfer.pause();
      return;
    }

    const current = wavesurfer.getCurrentTime();

    if (current < region.start || current >= region.end) {
      wavesurfer.setTime(region.start);
    }

    wavesurfer.play();
  };

  /*
   * Move playback position
   */
  const handleSeek = (e) => {
    const time = Number(e.target.value);

    setCurrentTime(time);
    waveSurferRef.current?.setTime(time);
  };

  /*
   * Actually cut the selected region out of the
   * loaded audio and download it as a .mp3 file.
   */
  const handleCut = async () => {
    const wavesurfer = waveSurferRef.current;

    if (!wavesurfer || selection.end <= selection.start) {
      setCutError("Select a valid range before cutting.");
      return;
    }

    setCutError(null);
    setIsCutting(true);

    try {
      // Reuse the buffer wavesurfer already decoded when possible,
      // to avoid re-downloading and re-decoding the whole file.
      let audioBuffer =
        typeof wavesurfer.getDecodedData === "function"
          ? wavesurfer.getDecodedData()
          : null;

      if (!audioBuffer) {
        const response = await fetch(audioUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch audio (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();

        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioCtx.close();
      }

      const slicedBuffer = sliceAudioBuffer(
        audioBuffer,
        selection.start,
        selection.end,
      );

      const mp3Blob = await audioBufferToMp3Blob(slicedBuffer);

      const baseName = fileName
        ? fileName.replace(/\.[^/.]+$/, "")
        : "clip";
      const downloadName = `${baseName}_cut.mp3`;

      triggerDownload(mp3Blob, downloadName);

      if (onCutDownload) {
        onCutDownload({
          audioUrl,
          fileName,
          startTime: selection.start,
          endTime: selection.end,
          duration: selection.end - selection.start,
          downloadName,
        });
      }
    } catch (error) {
      console.error("Cut & download failed:", error);
      setCutError("Could not cut this clip. Please try again.");
    } finally {
      setIsCutting(false);
    }
  };

  return (
    <div className="w-full">
      {/* WAVEFORM */}
      <div className="overflow-hidden rounded-md border border-[#cbd5d1] bg-[#f4f1a6]">
        <div ref={containerRef} className="w-full bg-[#f4f1a6]" />
      </div>

      {/* CONTROLS */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handlePlay}
          aria-pressed={isPlaying}
          className="flex items-center gap-2 rounded-md bg-[#2f9e8f] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#237d70]"
        >
          {isPlaying ? (
            <>
              <span className="text-sm">Ⅱ</span>
              Pause
            </>
          ) : (
            <>
              <span className="text-sm">▶</span>
              Play
            </>
          )}
        </button>

        <div className="whitespace-nowrap font-mono text-xs text-[#374151]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          aria-label="Seek playback position"
          className="h-1 flex-1 cursor-pointer accent-[#2f9e8f]"
        />

        <div className="whitespace-nowrap text-xs text-[#6b7a80]">
          Selected:{" "}
          <span className="font-mono text-[#1f2a2e]">
            {formatTime(selection.end - selection.start)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCut}
          disabled={isCutting}
          className="whitespace-nowrap rounded-md border border-[#237d70] bg-white px-4 py-2 text-xs font-medium text-[#237d70] transition hover:bg-[#e4f4f1] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCutting ? "Cutting…" : "Cut & Download"}
        </button>
      </div>

      {cutError && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {cutError}
        </p>
      )}
    </div>
  );
}