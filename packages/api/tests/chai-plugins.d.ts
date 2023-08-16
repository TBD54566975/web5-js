/// <reference types="chai" />

declare namespace Chai {

  // For BDD API
  interface Assertion extends LanguageChains, NumericComparison, TypeComparison {
      url: Assertion;
  }

  // For Assert API
  interface AssertStatic {
    isUrl: (actual: any) => Assertion;
  }
}