import { format, isValid, parse, parseISO } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "cn"

const DATE_FORMAT = "yyyy-MM-dd"
const TIME_FORMAT = "HH:mm"
const DATETIME_FORMAT = `${DATE_FORMAT}'T'${TIME_FORMAT}`

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /**
   * When true, the picker also captures a time of day and the value is a
   * local datetime string (`yyyy-MM-dd'T'HH:mm`). Defaults to date-only
   * (`yyyy-MM-dd`).
   */
  includeTime?: boolean
}

function parseValue(value: string, includeTime: boolean): Date | undefined {
  if (!value) return undefined
  if (includeTime) {
    const datetime = parse(value, DATETIME_FORMAT, new Date())
    if (isValid(datetime)) return datetime
  }
  const date = parseISO(value)
  return isValid(date) ? date : undefined
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder,
  includeTime = false,
}: Props) {
  const selected = value ? parseValue(value, includeTime) : undefined

  const emit = (d: Date | undefined) => {
    if (!d) {
      onChange("")
      return
    }
    onChange(includeTime ? format(d, DATETIME_FORMAT) : format(d, DATE_FORMAT))
  }

  const handleDaySelect = (d: Date | undefined) => {
    if (!d) {
      emit(undefined)
      return
    }
    // Preserve the previously picked time when only the day changes.
    if (includeTime && selected) {
      d.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
    }
    emit(d)
  }

  const handleTimeChange = (time: string) => {
    if (!time) return
    const [hours, minutes] = time.split(":").map(Number)
    const base = selected ?? new Date()
    const next = new Date(base)
    next.setHours(hours || 0, minutes || 0, 0, 0)
    emit(next)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {selected
          ? format(selected, includeTime ? "PPP p" : "PPP")
          : (placeholder ?? "Pick a date")}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleDaySelect}
          autoFocus
        />
        {includeTime && (
          <div className="flex items-center gap-2 border-t border-border p-3">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            <Input
              type="time"
              aria-label="Time"
              value={selected ? format(selected, TIME_FORMAT) : ""}
              onChange={(e) => handleTimeChange(e.target.value)}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
