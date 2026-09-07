import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useViewModeStore } from "@/store/viewMode"

export function ViewModeToggle() {
  const mode = useViewModeStore((s) => s.mode)
  const setMode = useViewModeStore((s) => s.setMode)

  return (
    <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
      <SelectTrigger size="sm" className="w-30 capitalize">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="card">Card</SelectItem>
        <SelectItem value="table">Table</SelectItem>
      </SelectContent>
    </Select>
  )
}
