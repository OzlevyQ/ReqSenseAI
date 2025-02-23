
import { Button } from "./button"
import { Download } from "lucide-react"

interface DownloadButtonProps {
  onDownload: () => void;
  disabled?: boolean;
}

export function DownloadButton({ onDownload, disabled }: DownloadButtonProps) {
  return (
    <Button
      onClick={onDownload}
      disabled={disabled}
      variant="secondary"
      className="gap-2 font-medium"
    >
      <Download className="h-4 w-4" />
      Download Report
    </Button>
  )
}
