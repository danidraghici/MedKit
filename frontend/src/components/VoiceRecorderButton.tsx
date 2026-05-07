import { useState, useRef } from "react";
import { Mic, MicOff, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { VoiceToMedicalRecordResponse } from "@/lib/types";

type RecorderState = "idle" | "recording" | "processing" | "done";

interface VoiceRecorderButtonProps {
  onResult: (result: VoiceToMedicalRecordResponse) => void;
}

export function VoiceRecorderButton({ onResult }: VoiceRecorderButtonProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Nu s-a putut accesa microfonul. Verificați permisiunile browserului.");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      void submitRecording();
    };

    recorder.start(250); // collect chunks every 250ms
    setState("recording");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setState("processing");
  };

  const submitRecording = async () => {
    const blob = new Blob(chunksRef.current, {
      type: mediaRecorderRef.current?.mimeType ?? "audio/webm",
    });

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      const result = await api.postFile<VoiceToMedicalRecordResponse>(
        "/api/ai/voice-to-medical-record",
        formData
      );
      setState("done");
      onResult(result);
      toast.success("Câmpurile au fost completate din dictare vocală.");
      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      setState("idle");
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("empty_transcript")) {
        toast.error("Nu s-a detectat nicio voce în înregistrare.");
      } else if (msg.includes("transcription_failed")) {
        toast.error("Transcrierea vocală a eșuat. Încercați din nou.");
      } else {
        toast.error("Procesarea vocii a eșuat. Încercați din nou.");
      }
    }
  };

  if (state === "recording") {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={stopRecording}
        className="gap-2 animate-pulse"
      >
        <MicOff className="w-4 h-4" />
        Oprește înregistrarea
      </Button>
    );
  }

  if (state === "processing") {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Se procesează...
      </Button>
    );
  }

  if (state === "done") {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="gap-2 text-emerald-600">
        <CheckCircle2 className="w-4 h-4" />
        Completat
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void startRecording()}
      className="gap-2"
    >
      <Mic className="w-4 h-4 text-primary" />
      Dictează consultația
    </Button>
  );
}
