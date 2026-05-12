import { useEffect, useState } from 'react'

// Hook simples para detectar se o aplicativo está em uma tela pequena
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 1024)

    checkScreen()
    window.addEventListener('resize', checkScreen)

    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  return isMobile
}
