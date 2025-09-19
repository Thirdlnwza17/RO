import 'next/headers';

declare module 'next/headers' {
  export function cookies(): {
    get: (name: string) => { value: string } | undefined;
    // Add other cookie methods if needed
  };
}
