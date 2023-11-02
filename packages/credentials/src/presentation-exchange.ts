import type { EvaluationResults, PresentationResult, SelectResults, Validated as PexValidated } from '@sphereon/pex';
import { PEX } from '@sphereon/pex';

import type { PresentationDefinitionV2 as PexPresDefV2 } from '@sphereon/pex-models';

import type {
  IPresentation,
  PresentationSubmission,
} from '@sphereon/ssi-types';

export type Validated = PexValidated;
export type PresentationDefinitionV2 = PexPresDefV2

export class PresentationExchange {
  /**
   * The Presentation Exchange (PEX) Library implements the functionality described in the DIF Presentation Exchange specification
   */
  private static pex: PEX = new PEX();

  /**
   * Selects credentials that satisfy a given presentation definition.
   *
   * @param vcJwts The list of Verifiable Credentials to select from.
   * @param presentationDefinition The Presentation Definition to match against.
   * @return A list of Verifiable Credentials that satisfy the Presentation Definition.
   */
  public static selectCredentials(
    vcJwts: string[],
    presentationDefinition: PresentationDefinitionV2
  ): string[] {
    this.resetPex();
    const selectResults: SelectResults = this.pex.selectFrom(presentationDefinition, vcJwts);
    return selectResults.verifiableCredential as string[] ?? [];
  }

  public static satisfiesPresentationDefinition(
    vcJwts: string[],
    presentationDefinition: PresentationDefinitionV2
  ): void {
    this.resetPex();
    const evaluationResults: EvaluationResults = this.pex.evaluateCredentials(presentationDefinition, vcJwts);
    if (evaluationResults.warnings?.length) {
      console.warn('Warnings were generated during the evaluation process: ' + JSON.stringify(evaluationResults.warnings));
    }

    if (evaluationResults.areRequiredCredentialsPresent.toString() !== 'info' || evaluationResults.errors?.length) {
      let errorMessage = 'Failed to create Verifiable Presentation JWT due to: ';
      if(evaluationResults.areRequiredCredentialsPresent) {
        errorMessage += 'Required Credentials Not Present: ' + JSON.stringify(evaluationResults.areRequiredCredentialsPresent);
      }

      if (evaluationResults.errors?.length) {
        errorMessage += 'Errors: ' + JSON.stringify(evaluationResults.errors);
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Creates a presentation from a list of Verifiable Credentials that satisfy a given presentation definition.
   * This function initializes the Presentation Exchange (PEX) process, validates the presentation definition,
   * evaluates the credentials against the definition, and finally constructs the presentation result if the
   * evaluation is successful.
   *
   * @param {string[]} vcJwts The list of Verifiable Credentials (VCs) in JWT format to be evaluated.
   * @param {PresentationDefinitionV2} presentationDefinition The Presentation Definition V2 to match the VCs against.
   * @returns {PresentationResult} The result of the presentation creation process, containing a presentation submission
   *                               that satisfies the presentation definition criteria.
   * @throws {Error} If the evaluation results in warnings or errors, or if the required credentials are not present, 
   *                 an error is thrown with a descriptive message.
   */
  public static createPresentationFromCredentials(
    vcJwts: string[],
    presentationDefinition: PresentationDefinitionV2
  ): PresentationResult {
    this.resetPex();

    const pdValidated: Validated = PEX.validateDefinition(presentationDefinition);
    isValid(pdValidated);

    const evaluationResults: EvaluationResults = this.pex.evaluateCredentials(presentationDefinition, vcJwts);

    if (evaluationResults.warnings?.length) {
      console.warn('Warnings were generated during the evaluation process: ' + JSON.stringify(evaluationResults.warnings));
    }

    if (evaluationResults.areRequiredCredentialsPresent.toString() !== 'info' || evaluationResults.errors?.length) {
      let errorMessage = 'Failed to create Verifiable Presentation JWT due to: ';
      if(evaluationResults.areRequiredCredentialsPresent) {
        errorMessage += 'Required Credentials Not Present: ' + JSON.stringify(evaluationResults.areRequiredCredentialsPresent);
      }

      if (evaluationResults.errors?.length) {
        errorMessage += 'Errors: ' + JSON.stringify(evaluationResults.errors);
      }

      throw new Error(errorMessage);
    }

    const presentationResult: PresentationResult = this.pex.presentationFrom(presentationDefinition, vcJwts);

    const submissionValidated: Validated = PEX.validateSubmission(presentationResult.presentationSubmission);
    isValid(submissionValidated);

    return presentationResult;
  }

  /**
   * This method validates whether an object is usable as a presentation definition or not.
   *
   * @param presentationDefinition: presentationDefinition to be validated.
   *
   * @return the validation results to reveal what is acceptable/unacceptable about the passed object to be considered a valid presentation definition
   */
  public static validateDefinition(presentationDefinition: PresentationDefinitionV2): Validated {
    return PEX.validateDefinition(presentationDefinition);
  }

  /**
   * This method validates whether an object is usable as a presentation submission or not.
   *
   * @param presentationSubmission the object to be validated.
   *
   * @return the validation results to reveal what is acceptable/unacceptable about the passed object to be considered a valid presentation submission
   */
  public static validateSubmission(presentationSubmission: PresentationSubmission): Validated {
    return PEX.validateSubmission(presentationSubmission);
  }

  /**
   * Evaluates a presentation against a presentation definition.
   * @returns {EvaluationResults} The result of the evaluation process.
   */
  public static evaluatePresentation(
    presentationDefinition: PresentationDefinitionV2,
    presentation: IPresentation
  ): EvaluationResults {
    this.resetPex();
    return this.pex.evaluatePresentation(presentationDefinition, presentation);
  }

  private static resetPex() {
    this.pex = new PEX();
  }
}

function isValid(validated: Validated) {
  let errorMessage = 'Failed to pass validation check due to: ';
  if (Array.isArray(validated)) {
    if (!validated.every(item => item.status === 'info')) {
      errorMessage += 'Validation Errors: ' + JSON.stringify(validated);
      throw new Error(errorMessage);
    }
  } else {
    if (validated.status !== 'info') {
      errorMessage += 'Validation Errors: ' + JSON.stringify(validated);
      throw new Error(errorMessage);
    }
  }
}
