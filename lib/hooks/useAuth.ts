'use client'

import { useEffect, useState } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '../firebase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password).then((result) => result.user)
  const signUp = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await fetch('/api/auth/setup-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: result.user.uid, email }),
    })
    return result.user
  }
  const signOut = () => firebaseSignOut(auth)
  const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider()).then((result) => result.user)
  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

  return { user, loading, signIn, signUp, signOut, signInWithGoogle, resetPassword }
}
