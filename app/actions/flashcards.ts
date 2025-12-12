 'use server'

 import { adminDb } from '../../lib/firebase/admin'
 import { revalidatePath } from 'next/cache'

export async function createFlashcard(data: {
  front: string
  back: string
  dialect: 'gulf' | 'msa'
  difficulty: number
}) {
  const flashcard = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  const docRef = await adminDb().collection('flashcards').add(flashcard)
  revalidatePath('/dashboard/flashcards')
  return { id: docRef.id, ...flashcard }
}

export async function updateFlashcard(id: string, data: Partial<{ front: string; back: string; difficulty: number }>) {
  await adminDb().collection('flashcards').doc(id).update({ ...data, updatedAt: new Date().toISOString() })
  revalidatePath('/dashboard/flashcards')
}

export async function deleteFlashcard(id: string) {
  await adminDb().collection('flashcards').doc(id).delete()
  revalidatePath('/dashboard/flashcards')
}
