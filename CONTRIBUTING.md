# Contribution Guide

There are many ways to be an open source contributor, and we're here to help you on your way! You may:

- Propose ideas in our Web5 [Discord](https://discord.com/channels/937858703112155166/969272658501976117) channel
- Raise an issue or feature request in our [issue tracker](https://github.com/TBD54566975/web5-js/issues)
- Help another contributor with one of their questions, or a code review
- Suggest improvements to our Getting Started documentation by supplying a Pull Request
- Evangelize our work together in conferences, podcasts, and social media spaces.

This guide is for you.

## 🎉 Hacktoberfest 2024 🎉

`web5-js` is a participating in Hacktoberfest 2024! We’re so excited for your contributions, and have created a wide variety of issues so that anyone can contribute. Whether you're a seasoned developer or a first-time open source contributor, there's something for everyone.

### Here's how you can get started:
1. Read the [code of conduct](https://github.com/TBD54566975/web5-js/blob/main/CODE_OF_CONDUCT.md).
2. Choose a task from this project's Hacktoberfest issues in our Project Hubs for [our protocol builder here](https://github.com/TBD54566975/tbd-examples/issues/97) and [general tasks here](https://github.com/TBD54566975/web5-js/issues/908) and follow the instructions. Each issue has the 🏷️ `hacktoberfest` label.
5. Comment ".take" on the corresponding issue to get assigned the task.
6. Fork the repository and create a new branch for your work.
7. Make your changes and submit a pull request.
8. Wait for review and address any feedback.

### 🏆 Leaderboard & Prizes
Be among the top 10 with the most points to snag custom swag just for you from our TBD shop! To earn your place in the leaderboard, we have created a points system that is explained below. As you complete tasks, you will automatically be granted a certain # of points.

#### Point System
| Weight | Points Awarded | Description |
|---------|-------------|-------------|
| 🐭 **Small** | 5 points | For smaller tasks that take limited time to complete and/or don't require any product knowledge. |
| 🐰 **Medium** | 10 points | For average tasks that take additional time to complete and/or require some product knowledge. |
| 🐂 **Large** | 15 points | For heavy tasks that takes lots of time to complete and/or possibly require deep product knowledge. |

#### Prizes
Top 10 contributors with the most points will be awarded TBD x Hacktoberfest 2024 swag. The Top 3 contributors will have special swag customized with your GitHub handle in a very limited design. (more info in our Discord)



### 👩‍ Need help?
Need help or have questions? Feel free to reach out by connecting with us in our [Discord community](https://discord.gg/tbd) to get direct help from our team in the `#hacktoberfest` project channel.

Happy contributing!

---


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
[on the Issues tab](https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+label%3A%22help+wanted%22%2C%22good+first+issue%22%2C%22documentation%22%2C%22bug%22+).

We suggest the following process when picking up one of these issues:

- Check to see if anyone is already working on the issue by looking to see if the issue has a `WIP` tag.
- Fork the repo and create a branch named the issue number you're taking on.
- Push that branch and create a draft PR.
- Paste a link to the draft PR in the issue you're tackling.
- We'll add the `WIP` tag for you.
- Work away. Feel free to ask any/all questions that crop up along the way.
- Switch the draft PR to "Ready for review".

### Discussions

Design discussions and proposals take place on our Web5 [Discord](https://discord.com/channels/937858703112155166/969272658501976117) channel.

We advocate an asynchronous, written debate model - so write up your thoughts and invite the community to join in!

### Continuous Integration

Build and Test cycles are run on every commit to every branch using [GitHub Actions](https://github.com/TBD54566975/web5-js/actions).

## Development Prerequisites

### Hermit

This project uses hermit to manage tooling like node. See [this page](https://cashapp.github.io/hermit/usage/get-started/) to set up Hermit on your machine - make sure to download the open source build and activate it for the project.

Currently, we have these packages installed via Hermit (can also view by checking out `hermit status`):

| Requirement | Tested Version |
| ----------- | -------------- |
| Node.js     | 20.9.0         |
| PNPM        | 8.15.4         |

### TypeScript

This project is written in TypeScript, a strongly typed programming language that builds on JavaScript.

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
  [this beginner's guide to squashing commits](https://medium.com/@slamflipstrom/a-beginners-guide-to-squashing-commits-with-git-rebase-8185cf6e62ec)
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

> [!IMPORTANT]
> Before running tests ensure you've completed the following steps:
>
> 1. Install the [development prerequisites](#development-prerequisites).
> 2. Follow the [these steps](https://github.com/TBD54566975/web5-js#cloning) to clone this repository and `cd` into the project directory.
> 3. Install all project dependencies by running `pnpm install` from the root directory of the project.
> 4. Build all workspace projects by running npm `pnpm build` from the root directory of the project.

- Running the `pnpm --recursive test:node` command from the root of the project will run all tests using node.
  - This is run via CI whenever a pull request is opened, or a commit is pushed to a branch that has an open PR
- Running the `pnpm --recursive test:browser` command from the root of the project will run the tests in a browser environment
  - Please make sure there are no failing tests before switching your PR to ready for review! We hope to have this automated via a github action very soon.
- You can also run `pnpm --filter=PACKAGE test:node` or `pnpm --filter=PACKAGE test:browser` from the root of the project to run tests for a single package. For example, to run the tests only for the `dids` package run `pnpm --filter=dids test:node`.

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

### Documentation Generator

We are using [tbdocs](https://github.com/TBD54566975/tbdocs) to check, generate and publish our SDK API Reference docs automatically to GH Pages.

To see if the docs are being generated properly without errors, and to preview the generated docs locally execute the following script:

```sh
./scripts/tbdocs-check-local.sh

# to see if there are any doc errors
open .tbdocs/docs-report.md

# to serve the generated docs locally using a static server (e.g. `pnpm install -g http-server`)
http-server .tbdocs/docs
```

The errors can be found at `./tbdocs/summary.md`

_PS: You need to have docker installed on your computer._

### Project Versioning Guidelines

This section provides guidelines for versioning Web5 JS packages. All releases are published to the
[NPM Registry](https://npmjs.com). By following these guidelines, you can ensure that package versioning
remains consistent and well-organized.

#### Stable Releases

We use semantic versioning for stable releases that have completed testing and are considered reliable enough for
general use.

This project uses [Changesets](https://github.com/changesets/changesets) for semver management. For motivations, see [full explanation here](https://github.com/changesets/changesets/blob/main/docs/detailed-explanation.md).

Upon opening a Pull Request, the `changeset-bot` will automatically comment ([example](https://github.com/TBD54566975/tbdex-js/pull/30#issuecomment-1732721942)) on the PR with a reminder & recommendations for creating/managing the changeset for the given changes.

If your changes to the packages warrant semantic version increments, you should run `npx changeset` locally. This command will trigger the changesets CLI, which will help you create changeset files to include in your Pull Request.

The CLI tool will walk you through a set of steps for you to define the semantic changes. This will create a randomly-named (and funnily-named) markdown file within the `.changeset/` directory. For example, see the `.changeset/sixty-tables-cheat.md` file on [this PR](https://github.com/TBD54566975/tbdex-js/pull/35/files). There is an analogy to staging a commit (using `git add`) for these markdown files, in that, they exist so that the developer can codify the semantic changes made but they don't actually update the semantic version.

> [!NOTE]
>
> Unique to this repo, always include only the `api` package in its own changeset file, separate from other packages: if there are changes to both the api package and other packages, run the CLI tool twice to create two separate changeset files. This is necessary because the api package is released separately via a manually triggered GitHub action. See [Web5 API Releases](#web5-api-releases) section below for more detail.

Once your PR is merged into the `main` branch together with the changeset files generated, the Changeset GitHub Action will automatically pick up those changes and open a PR to automate the `npx changeset version` execution. For example, [see this PR](https://github.com/TBD54566975/tbdex-js/pull/36). This command will do two things: update the version numbers in the relevant `package.json` files & also aggregate Summary notes into the relevant `CHANGELOG.md` files. In keeping with the staged commit analogy, this is akin to the actual commit.

**Publishing Releases**

Project maintainers will just merge the [Version Packages PR](https://github.com/TBD54566975/web5-js/pulls?q=is%3Apr+author%3Aapp%2Fgithub-actions+%22Version+Packages%22+) when it's ready to publish the new versions!

When these PRs are merged to main we will automatically publish to NPM and create corresponding git tags with the changelog notes, and mirror each tag to a GitHub release per package.

> [!NOTE]
>
> This is all achieved by the Changesets GitHub action being used in the [Release Workflow](./.github/workflows/release.yml).

The next time someone runs `pnpm install @web5/<package_name>` the newly published release will be installed.

##### Recapping the steps for a new release publish

Recap of the above changesets, plus the release process:

1. Open a PR
2. `changeset-bot` will automatically [comment on the PR](https://github.com/TBD54566975/tbdex-js/pull/30#issuecomment-1732721942) with a reminder & recommendations for semver
3. Run `pnpm changeset` locally and push changes (`.changeset/*.md`)
4. Merge PR into `main`
5. Profit from the automated release pipeline:
   - [Release Workflow](./.github/workflows/release.yml) will create a new Version Package PR, or update the existing one
   - When maintainers are ready to publish the new changes, they will merge that PR and the very same [Release Workflow](./.github/workflows/release.yml) will automatically publish a [new version to NPM](https://www.npmjs.com/package/@web5/dids?activeTab=versions), and publish the docs to https://tbd54566975.github.io/web5-js/

#### Web5 API Releases

The `@web5/api` package is special because it dictates our release train schedule. Whenever a new Web5 API needs to be released projects maintainers will need to reach out to DevRel team to orchestrate an announcement to the community and follow a set of tests to ensure the Web5 API release is reliable and working ([example here](https://github.com/TBD54566975/developer.tbd.website/issues/1129)).

**Because of that, the changesets of the `@web5/api` are ignored by default.**

Check below how to enable the `@web5/api` package release.

##### @web5/api New Standalone Release

1. Go to the [Release workflow](https://github.com/TBD54566975/web5-js/actions/workflows/release.yml)
2. Press the `Run Workflow` button and select the `Initiate @web5/api release` checkbox
3. Push `Run Workflow`

This will create a new [Version Packages PR](https://github.com/TBD54566975/tbdex-js/pulls?q=is%3Apr+author%3Aapp%2Fgithub-actions+%22Version+Packages%22+is%3Aopen) with the `@web5/api` package bump, if there are any relevant changesets for the package.

##### @web5/api Release with other package bumps

In the rare occasion where `@web5/api` needs to be bumped together with other packages, just label the existing Version Package PR.

1. Go to the current [Version Packages PR](https://github.com/TBD54566975/tbdex-js/pulls?q=is%3Apr+author%3Aapp%2Fgithub-actions+%22Version+Packages%22+is%3Aopen)
2. Label the PR with the `api-release` tag
3. The release workflow should be triggered and the `@web5/api` package changes should be included in the PR as soon as the workflow completes.

##### @web5/api Canceling Release

If for some reason you need to bump other packages and the `@web5/api` is added to the current Version Package PR, this will probably block your release until everything is sorted in the web5/dwn side of things... Follow the steps below to ignore the `@web5/api` package release.

1. Go to the current [Version Packages PR](https://github.com/TBD54566975/tbdex-js/pulls?q=is%3Apr+author%3Aapp%2Fgithub-actions+%22Version+Packages%22+is%3Aopen)
2. Remove the `api-release` label from the PR
3. The release workflow should be triggered and the `@web5/api` package changes should be removed from the PR as soon as the workflow completes.

#### Preview Releases

With the Changesets automation, every push to main with relevant changesets, will publish the corresponding packages to the NPM registry automatically with the tag `next`.

The preview releases are useful for testing and verifying the changes before publishing a stable release.

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

To install an `alpha` tagged release use either the `pnpm install @web5/<package>@alpha` or
`pnpm install @web5/<package>@x.y.z-alpha-YYYYMMDD-commithash` syntax.
