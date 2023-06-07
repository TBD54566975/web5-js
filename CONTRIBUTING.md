# Contribution Guide

There are many ways to be an open source contributor, and we're here to help you on your way! You may:

- Propose ideas in our Web5 [Discord](https://discord.com/channels/937858703112155166/969272658501976117) channel
- Raise an issue or feature request in our [issue tracker](https://github.com/TBD54566975/web5-js/issues)
- Help another contributor with one of their questions, or a code review
- Suggest improvements to our Getting Started documentation by supplying a Pull Request
- Evangelize our work together in conferences, podcasts, and social media spaces.

This guide is for you.

## Communications

### Issues

Anyone from the community is welcome (and encouraged!) to raise issues via
[GitHub Issues](https://github.com/TBD54566975/web5-js/issues).

As we work our way towards a beta release and beyond, we'll be creating more focused issues with the following labels:

- `bug`
- `documentation`
- `good first issue`
- `help wanted`

These issues are excellent canditates for contribution and we'd be thrilled to get all the help we can get! You can
take a look at all of the Issues that match the labels above
[here](https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+label%3A%22help+wanted%22%2C%22good+first+issue%22%2C%22documentation%22%2C%22bug%22+).

We suggest the following process when picking up one of these issues:

- Check to see if anyone is already working on the issue by looking to see if the issue has a `WIP` tag.
- Fork the repo and create a branch named the issue number you're taking on.
- Push that branch and create a draft PR.
- Paste a link to the draft PR in the issue you're tackling.
- We'll add the `WIP` tag for you.
- Work away. Feel free to ask any/all questions that crop up along the way.
- Switch the draft PR to "Ready for review".

### Discussions

Design discussions and proposals take place on our Web5 [discord](https://discord.com/channels/937858703112155166/969272658501976117) channel.

We advocate an asynchronous, written debate model - so write up your thoughts and invite the community to join in!

### Continuous Integration

Build and Test cycles are run on every commit to every branch using [GitHub Actions](https://github.com/TBD54566975/web5-js/actions).

## Development Prerequisites

| Requirement | Tested Version | Installation Instructions                                                                      |
| ----------- | -------------- | ---------------------------------------------------------------------------------------------- |
| Node.js     | 18.16.0        | [Introduction to Node.js](https://nodejs.dev/en/learn/)                                        |
| NPM         | 9.6.3          | [NPM Package Manager](https://nodejs.dev/en/learn/an-introduction-to-the-npm-package-manager/) |

### TypeScript

This project is written in TypeScript, a strongly typed programming language that builds on JavaScript.

You may verify your `node` and `npm` installation via the terminal:

```
$ node --version
v18.16.0
$ npm --version
9.6.3
```

If you do not have Node.js installed, we recommend following the
[Introduction to Node.js](https://nodejs.dev/en/learn/) guide.

## Contribution

We review contributions to the codebase via GitHub's Pull Request mechanism. We have
the following guidelines to ease your experience and help our leads respond quickly
to your valuable work:

- Start by proposing a change either in Issues (most appropriate for small
  change requests or bug fixes) or in Discussions (most appropriate for design
  and architecture considerations, proposing a new feature, or where you'd
  like insight and feedback)
- Cultivate consensus around your ideas; the project leads will help you
  pre-flight how beneficial the proposal might be to the project. Developing early
  buy-in will help others understand what you're looking to do, and give you a
  greater chance of your contributions making it into the codebase! No one wants to
  see work done in an area that's unlikely to be incorporated into the codebase.
- Fork the repo into your own namespace/remote
- Work in a dedicated feature branch. Atlassian wrote a great
  [description of this workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow)
- When you're ready to offer your work to the project, first:
- Squash your commits into a single one (or an appropriate small number of commits), and
  rebase atop the upstream `main` branch. This will limit the potential for merge
  conflicts during review, and helps keep the audit trail clean. A good writeup for
  how this is done is
  [here](https://medium.com/@slamflipstrom/a-beginners-guide-to-squashing-commits-with-git-rebase-8185cf6e62ec), and if you're
  having trouble - feel free to ask a member or the community for help or leave the commits as-is, and flag that you'd like
  rebasing assistance in your PR! We're here to support you.
- Open a PR in the project to bring in the code from your feature branch.
- [Codecov](https://app.codecov.io/github/TBD54566975/web5-js) will automatically comment on your pull request showing the impact to the overall test coverage.
- The maintainers noted in the [`CODEOWNERS`](https://github.com/TBD54566975/web5-js/blob/main/CODEOWNERS) file will review your PR and optionally
  open a discussion about its contents before moving forward.
- Remain responsive to follow-up questions, be open to making requested changes, and...
  You're a contributor!
- And remember to respect everyone in our global development community. Guidelines
  are established in our [`CODE_OF_CONDUCT.md`](https://github.com/TBD54566975/web5-js/blob/main/CODE_OF_CONDUCT.md).

### Running Tests

- Running the `npm run test:node --ws` command from the root of the project will run all tests using node.
  - This is run via CI whenever a pull request is opened, or a commit is pushed to a branch that has an open PR
- Running the `npm run test:browser --ws` command from the root of the project will run the tests in a browser environment
  - Please make sure there are no failing tests before switching your PR to ready for review! We hope to have this automated via a github action very soon.
- You can also run `npm run test:node -w=packages/DIR` or `npm run test:browser -w=packages/DIR` from the root of the project to run tests for a single package. For example, to run the tests only for the `web5` package run `npm run test:node -w=packages/web5`.

### Test Coverage Expectations

To maintain the robustness and reliability of the codebase, we highly value test coverage.

- [Codecov](https://app.codecov.io/github/TBD54566975/web5-js) is used to track
  the coverage of our tests and will automatically comment on every pull request
  showing the impact to overall coverage.
- We have a strong expectation for every pull request to strive for 100% test
  coverage. This means that all new code you contribute should be fully covered
  by tests, and it should not decrease the overall test coverage of the project.
- If your pull request introduces new features or changes existing logic, please
  ensure you include comprehensive tests that cover edge-cases and failure
  scenarios. This ensures that your contributions are of the highest quality and
  safeguards our codebase against potential bugs or breaking changes.
- Thorough tests are also a great way to better understand your proposed changes.
- If you encounter any difficulties while writing tests, don't hesitate to reach
  out for help or guidance in our Web5
  [Discord](https://discord.com/channels/937858703112155166/969272658501976117)
  channel.

### Project Versioning Guidelines

This section provides guidelines for versioning Web5 JS packages. All releases are published to the
[NPM Registry](https://npmjs.com). By following these guidelines, you can ensure that package versioning
remains consistent and well-organized.

#### Stable Releases

We use semantic versioning for stable releases that have completed testing and are considered reliable enough for
general use. Project maintainers will follow the steps below to create a new release:

1. For each updated package that requires a new release, update the version in `package.json` according to semantic versioning rules (`MAJOR.MINOR.PATCH`).

1. In a local feature branch, commit the changes:

   ```
   git add package.json
   git commit -m "Bump version to x.y.z"
   ```

1. Create a tag for the new release:

   ```
   git tag -a vx.y.z -m "Release x.y.z"
   ```

1. Push the changes and the tag to the remote repository:

   ```
   git push --tags
   ```

1. Open a pull request (PR) from your feature branch to begin the review process.

After one or more PRs have been approved and merged by project maintainers, a GitHub Release will be created using the
version tag. The act of creating the GitHub release triggers automated publication of the package to the
[NPM Registry](https://npmjs.com) which will be tagged as _latest_.

The next time someone runs `npm install @tbd54566975/<package_name>` the newly published release will be installed.

#### Alpha Releases

Project maintainers can release an alpha version at any time from main or feature branches. We use the
`version-alpha-date-commithash` naming convention for alpha releases. Once triggered, alpha releases are automatically
published to the [NPM Registry](https://npmjs.com) by the GitHub Actions CI system.

To create an alpha release, a project maintainer should follow these steps:

1. Access the [Web5 JS GitHub](https://github.com/TBD54566975/web5-js) repository from a web browser.

1. Click the **"Actions"** tab.

1. Select the **"Alpha to NPM Registry"** workflow.

1. Click the **"Run workflow"** button and use the drop-down menu to select the branch you wish to publish an alpha release from.

1. Click the **"Run workflow"** button.

Within a few seconds you'll see the dispatched workflow begin running. Then alpha tagged releases will be published to
the [NPM Registry](https://npmjs.com) within a few minutes.

> **Note**
> Alpha version will never be tagged as _latest_.

To install an `alpha` tagged release use either the `npm install @tbd54566975/<package>@alpha` or
`npm install @tbd5456975/<package>@x.y.z-alpha-YYYYMMDD-commithash` syntax.
