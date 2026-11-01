// troika-three-text ships no type declarations; only the API used by this app is declared.
declare module 'troika-three-text' {
  export interface TextBuilderConfig {
    defaultFontURL?: string;
    unicodeFontsURL?: string;
    sdfGlyphSize?: number;
    useWorker?: boolean;
  }
  export function configureTextBuilder(config: TextBuilderConfig): void;
}
