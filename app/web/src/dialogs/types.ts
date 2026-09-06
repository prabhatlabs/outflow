export const DIALOGS = ["createGroup", "confirm"] as const

export type DialogType = (typeof DIALOGS)[number]

export type DialogPayloadMap = {
  createGroup: undefined | { defaultName?: string }
  confirm: {
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    onConfirm: () => void | Promise<void>
  }
}

export type OpenDialog = {
  id: string
  type: DialogType
  payload?: DialogPayloadMap[DialogType]
}
