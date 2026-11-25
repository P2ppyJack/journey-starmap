/** Minimal React stand-in for the node tests: hooks are inert, nothing paints. */

export const useState = <T,>(initial: T | (() => T)) => [
  typeof initial === 'function' ? (initial as () => T)() : initial,
  () => undefined
]

export const useRef = <T,>(initial: T) => ({ current: initial })
export const useEffect = () => undefined
export const useLayoutEffect = () => undefined
export const useMemo = <T,>(fn: () => T) => fn()
export const useCallback = <T,>(fn: T) => fn
export const memo = <T,>(fn: T) => fn
export const useContext = () => ({})
export const createContext = () => ({})
export const Fragment = 'Fragment'
export default { createContext, Fragment, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState }
