/**
 * This script updates the @web5/* dependencies of each package in the
 * workspace to use the latest version defined in each package.json file.
 */

import PackageJson from '@npmcli/package-json';

/**
 * List of workspace packages to exclude from processing. Add any
 * package names that should be excluded to this array.
 *
 * @example
 *
 * const excludeWorkspaces = ['packages/experimental-salamander'];
 */
const excludeWorkspaces = [''];

/**
 * Retrieves the workspaces from the root package.json, excluding specified
 * workspaces.
 *
 * @returns {string[]} An array of workspace names excluding those listed in
 * `excludeWorkspaces`.
 */
async function getWorkspaces() {
  const rootPackageJson = await PackageJson.load('./');
  const workspaces = [];

  for (const workspace of rootPackageJson.content.workspaces) {
    if (excludeWorkspaces.includes(workspace)) continue;
    workspaces.push(workspace);
  }

  return workspaces;
}

/**
 * Retrieves the versions of packages for the given paths.
 *
 * @param {string[]} paths - An array of paths to the package.json files.
 * @returns {Record<string, string>} An object mapping package names to their
 * corresponding versions.
 */
async function getPackageVersions(paths) {
  const versions = {};

  for (const path of paths) {
    const packageJson = await PackageJson.load(path);
    const packageName = packageJson.content.name;
    const version = packageJson.content.version;
    versions[packageName] = version;
  }

  return versions;
}

/**
 * Updates dependencies of the workspaces to the latest versions.
 *
 * @param {string[]} workspaces - An array of workspace paths.
 * @param {Record<string, string>} packageVersions - An object mapping package
 * names to their latest versions.
 */
async function updateDependencies(workspaces, packageVersions) {
  for (const workspace of workspaces) {
    const packageJson = await PackageJson.load(workspace);

    const dependencies = packageJson.content.dependencies;
    const devDependencies = packageJson.content.devDependencies;

    for (const packageName in packageVersions) {
      // If the package is a dependency, update to the latest version.
      if (packageName in dependencies) {
        dependencies[packageName] = packageVersions[packageName];
      }
      // If the package is a devDependency, update to the latest version.
      if (packageName in devDependencies) {
        devDependencies[packageName] = packageVersions[packageName];
      }
    }

    // Write changes, if any, to each `package.json` file.
    packageJson.update({ dependencies, devDependencies });
    await packageJson.save();
  }
}

/**
 * Each time the script is executed, the `version` string is
 * read from each package.json file and web5/* dependency
 * versions, if any, are updated.
 */
async function main() {
  const workspaces = await getWorkspaces();
  const packageVersions = await getPackageVersions(workspaces);
  await updateDependencies(workspaces, packageVersions);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});