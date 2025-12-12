'use client'

import { useEffect, useState } from 'react'
import { collection, query, onSnapshot, DocumentData } from 'firebase/firestore'
import { db } from '../firebase/client'

export function useRealtimeCollection<T = DocumentData>(collectionPath: string, queryConstraints: any[] = []) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const collectionRef = collection(db, collectionPath)
    const q = query(collectionRef, ...queryConstraints)
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as T[])
        setLoading(false)
      },
      (err) => {
        console.error('Firestore subscription error:', err)
        setError(err as Error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [collectionPath, JSON.stringify(queryConstraints)])

  return { data, loading, error }
}
