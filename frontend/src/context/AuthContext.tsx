import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, UserProfile } from '../types'

interface AuthContextType {
  user: UserProfile | null
  profile: Profile | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = async (userId: string | null) => {
    if (!userId) {
      setProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, id_ubs')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Falha ao carregar perfil:', error)
      setProfile(null)
      return
    }

    setProfile(data as Profile)
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Falha ao fazer login:', error)
      throw error
    }

    if (data?.user) {
      const signedUser: UserProfile = {
        id: data.user.id,
        email: data.user.email ?? '',
      }
      setUser(signedUser)
      await loadProfile(data.user.id)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Falha ao sair:', error)
      return
    }
    setUser(null)
    setProfile(null)
  }

  useEffect(() => {
    async function initializeAuth() {
      const { data } = await supabase.auth.getSession()
      const currentUser = data.session?.user

      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email ?? '',
        })
        await loadProfile(currentUser.id)
      }
    }

    initializeAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
        })
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({ user, profile, signIn, signOut }),
    [user, profile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
