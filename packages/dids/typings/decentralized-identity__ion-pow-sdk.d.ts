declare module '@decentralized-identity/ion-pow-sdk' {
  export default class IonProofOfWork {
    static randomHexString(): string;
    static submitIonRequestUntilSuccess(getChallengeUri: string, solveChallengeUri: string, requestBody: string): Promise<void>;
    static submitIonRequest(getChallengeUri: string, solveChallengeUri: string, requestBody: string): Promise<string | undefined>;
  }
}