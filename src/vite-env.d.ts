/// <reference types="vite/client" />
/// <reference lib="webworker" />

declare module 'solc/wrapper' {
    const wrapper: any;
    export default wrapper;
  }
  
  declare global {
    interface Window {
      Module: any;
    }
  }