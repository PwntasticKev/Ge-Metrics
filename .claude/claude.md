Be extremely concise, Sacrifice grammar for the sake of concision

# Behavioral Rules
1. **Ambiguity Protocol:** If any task is unclear or has multiple implementation paths, always use the `AskUserQuestion` tool to clarify my intent before writing code.
2. **Commit Workflow:** After completing a coding task, always prompt to use the `commit-commands` plugin to stage and commit the changes with a descriptive message.
3. **Verification:** Before finishing a task, ask me a follow-up question to verify that the output meets my specific requirements.

 ## 🧪 Mandatory Testing Before Completion

  ### Pre-Completion Checklist
  - [ ] Unit tests written and passing
  - [ ] E2E tests written and passing (for UI features)
  - [ ] Build passes without errors
  - [ ] No console errors in browser
  - [ ] Tested in both light and dark mode (if UI)
  - [ ] Tested on mobile viewport (if UI)