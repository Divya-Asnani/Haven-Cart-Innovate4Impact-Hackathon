declare module 'react' {
  export interface Context<T> {
      Provider: any;
      Consumer: any;
  }
  export function useState<S>(initialState: S | (() => S)): [S, (newState: S | ((prevState: S) => S)) => void];
  export function useState<S = undefined>(): [S | undefined, (newState: S | undefined | ((prevState: S | undefined) => S | undefined)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useContext<T>(context: Context<T>): T;
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useRef<T>(initialValue: T): { current: T };
  export type ReactNode = any;
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => any;
  const React: any;
  export default React;
}

declare module 'react-native';
declare module 'react-native-safe-area-context';
declare module 'lucide-react-native';
declare module 'expo-secure-store';
declare module 'react-native-uuid';

declare namespace NodeJS {
  type Timeout = any;
}
