import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DoctorScheduleTab } from "@/components/DoctorScheduleTab";

interface Props {
  doctorId: string;
  doctorName: string;
  onNavigate: (page: string) => void;
}

export default function AdminDoctorSchedulePage({ doctorId, doctorName, onNavigate }: Props) {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("doctors")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Schedule — {doctorName}</h1>
          <p className="text-sm text-muted-foreground">View and propose changes to this doctor's schedule</p>
        </div>
      </div>

      {/* Admin notice */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-300">
          Any changes you submit will be sent to the doctor for approval before taking effect.
        </AlertDescription>
      </Alert>

      {/* Schedule viewer/editor — admin mode: read-only view with propose buttons */}
      <DoctorScheduleTab doctorId={doctorId} adminMode />
    </div>
  );
}
