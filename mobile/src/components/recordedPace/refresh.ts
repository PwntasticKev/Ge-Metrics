/** Manual refresh drops ephemeral opt-ins before scheduling any saved-history reload. */
export function refreshRecordedPace(resetChoices: (choices: Record<string, number>) => void, reload: () => void): void {
  resetChoices({})
  reload()
}
