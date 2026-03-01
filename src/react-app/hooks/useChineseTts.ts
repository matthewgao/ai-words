import { useCallback, useRef } from "react";
import { api } from "@/lib/api";

const audioCache = new Map<string, Blob>();

export function useChineseTts() {
	const currentAudioRef = useRef<HTMLAudioElement | null>(null);
	const currentUrlRef = useRef<string | null>(null);

	const preload = useCallback(async (text: string) => {
		if (audioCache.has(text)) return;
		try {
			const buffer = await api.ttsSpeak(text);
			audioCache.set(text, new Blob([buffer], { type: "audio/mpeg" }));
		} catch {
			// preload failure is non-critical
		}
	}, []);

	const speak = useCallback(async (text: string): Promise<void> => {
		if (currentAudioRef.current) {
			currentAudioRef.current.pause();
			currentAudioRef.current = null;
		}
		if (currentUrlRef.current) {
			URL.revokeObjectURL(currentUrlRef.current);
			currentUrlRef.current = null;
		}

		let blob = audioCache.get(text);
		if (!blob) {
			const buffer = await api.ttsSpeak(text);
			blob = new Blob([buffer], { type: "audio/mpeg" });
			audioCache.set(text, blob);
		}

		const url = URL.createObjectURL(blob);
		currentUrlRef.current = url;
		const audio = new Audio(url);
		currentAudioRef.current = audio;

		return new Promise<void>((resolve, reject) => {
			audio.onended = () => {
				currentAudioRef.current = null;
				resolve();
			};
			audio.onerror = () => {
				currentAudioRef.current = null;
				reject(new Error("音频播放失败"));
			};
			audio.play().catch(reject);
		});
	}, []);

	const stop = useCallback(() => {
		if (currentAudioRef.current) {
			currentAudioRef.current.pause();
			currentAudioRef.current = null;
		}
		if (currentUrlRef.current) {
			URL.revokeObjectURL(currentUrlRef.current);
			currentUrlRef.current = null;
		}
	}, []);

	return { speak, preload, stop };
}
