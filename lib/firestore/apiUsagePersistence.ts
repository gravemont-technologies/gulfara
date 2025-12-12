import { adminDb } from '../firebase/admin'

const usageCollection = () => adminDb().collection('userApiUsage')

export interface ApiUsageEntry {
  userId: string
  period: string
  tokens: number
  cost: number
  model: string
  action?: string
  createdAt: string
}

export interface ApiUsagePersistence {
  getMonthlyCost(userId: string, period: string): Promise<number>
  logUsage(entry: ApiUsageEntry): Promise<void>
}

export const apiUsagePersistence: ApiUsagePersistence = {
  async getMonthlyCost(userId, period) {
    const snapshot = await usageCollection()
      .where('userId', '==', userId)
      .where('period', '==', period)
      .get()

    return snapshot.docs.reduce((sum, doc) => sum + Number(doc.data().cost ?? 0), 0)
  },

  async logUsage(entry) {
    await usageCollection().add(entry)
  }
}
