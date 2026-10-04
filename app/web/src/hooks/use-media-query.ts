import * as React from "react"

export function useMediaQuery(query: string) {
  const getInitial = () => {
    if (typeof window === "undefined") return undefined
    return window.matchMedia(query).matches
  }
  const [matches, setMatches] = React.useState<boolean | undefined>(getInitial)

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener("change", onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return !!matches
}

// Tailwind's 2xl breakpoint (default 1536px)
export function useIs2xl() {
  return useMediaQuery("(min-width: 1536px)")
}
