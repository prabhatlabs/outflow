export const DIALOGS = [
  "createGroup",
  "confirm",
  "budget",
  "editProfile",
  "expense",
  "settlement",
  "category",
  "inviteMember",
  "groupBudget",
] as const

export type DialogType = (typeof DIALOGS)[number]

export type DialogPayloadMap = {
  createGroup: undefined | { defaultName?: string; groupId?: string }
  confirm: {
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    onConfirm: () => void | Promise<void>
  }
  budget: { budgetId?: string } | undefined
  editProfile: undefined
  expense: { groupId: string; expenseId?: string } | undefined
  settlement:
    | { groupId: string; fromUserId?: string; toUserId?: string; amount?: number }
    | undefined
  category: { groupId: string; categoryId?: string } | undefined
  inviteMember: { groupId: string } | undefined
  groupBudget: { groupId: string; budgetId?: string } | undefined
}

export type OpenDialog = {
  id: string
  type: DialogType
  payload?: DialogPayloadMap[DialogType]
}
