// src/types/global.d.ts
declare module 'solc' {
    const solc: {
      compile: (input: string) => string;
      version: () => string;
    };
    export = solc;
  }