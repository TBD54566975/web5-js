import { expect } from "chai";
import { PlatformAgentTestHarness } from "../src/test-harness.js";
import { TestAgent } from "./utils/test-agent.js";
import { testDwnUrl } from "./utils/test-config.js";
import type { BearerIdentity } from "../src/bearer-identity.js";
import { connectClient } from "../src/connect-v2.js";

let testDwnUrls = [testDwnUrl];

describe("connect-v2", () => {
  let testHarness: PlatformAgentTestHarness;

  before(async () => {
    let alice: BearerIdentity;

    testHarness = await PlatformAgentTestHarness.setup({
      agentClass: TestAgent,
      agentStores: "memory",
    });

    await testHarness.createAgentDid();
    alice = await testHarness.createIdentity({ name: "Alice", testDwnUrls });
    await testHarness.agent.identity.manage({
      portableIdentity: await alice.export(),
    });
  });

  // beforeEach(async () => {
  //   await testHarness.clearStorage();
  //   await testHarness.createAgentDid();
  // });

  after(async () => {
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  describe("client connect", () => {
    it("build an OIDC request using the clientDid and permissionRequests", async () => {
      // connectClient()
      // expect("foo").not.to.be.null;
    });

    // it("signs the OIDC request using the private key of the clientDid", async () => {});
    // it("encrypts the OIDC request using the code challenge and a nonce", async () => {});
    // it("posts the constructed PAR to the PAR endpoint", async () => {});
  });
});
