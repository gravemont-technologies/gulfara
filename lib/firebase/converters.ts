import { DocumentData, QueryDocumentSnapshot, FirestoreDataConverter } from 'firebase/firestore/lite'

export interface Flashcard {
  id: string
  front: string
  back: string
  dialect: 'gulf' | 'msa'
  difficulty: 1 | 2 | 3 | 4 | 5
  createdAt: Date
  updatedAt: Date
}

export const flashcardConverter: FirestoreDataConverter<Flashcard> = {
  toFirestore: ({ id, createdAt, updatedAt, ...rest }) => ({
    ...rest,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): Flashcard => {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      front: data.front,
      back: data.back,
      dialect: data.dialect,
      difficulty: data.difficulty,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }
  },
}
