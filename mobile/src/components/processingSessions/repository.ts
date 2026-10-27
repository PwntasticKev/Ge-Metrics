import type { RecorderSession } from './model'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createProcessingSessionRepository } from '../../lib/processingSessionStorage'

// All screens share this queue; never instantiate a repository inside a component.
export const processingSessionRepository = createProcessingSessionRepository(AsyncStorage)

// Retain failed edits across navigation; durable records remain authoritative after restart.
export const pendingSessions = new Map<string, RecorderSession>()

// Separate backup survives choosing / editing the committed snapshot until explicit discard.
export const recoveryDrafts = new Map<string, RecorderSession>()
