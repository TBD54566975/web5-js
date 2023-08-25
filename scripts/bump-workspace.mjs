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
 * Retrieves the versions of packages for the given paths, optionally appending
 * a prerelease tag to the versions.
 *
 * This function reads the package versions from the specified paths and builds
 * an object mapping package names to their corresponding versions. If a
 * prerelease value is provided, it will be appended to the version string.
 *
 * @param {string[]} paths - An array of paths to the package.json files.
 * @param {string} [prerelease] - An optional prerelease tag to append to the
 * versions (e.g., 'alpha', 'beta').
 * @returns {Record<string, string>} An object mapping package names to their
 * corresponding versions.
 */
async function getPackageVersions(paths, prerelease) {
  const versions = {};

  for (const path of paths) {
    const packageJson = await PackageJson.load(path);
    // Get the package name (e.g., '@web5/common')
    const packageName = packageJson.content.name;
    // Get the current major.minor.patch version (e.g., '0.2.0').
    const [currentVersion] = packageJson.content.version.split('-');
    // Prefix the prerelease value, if any, with a hyphen.
    const versionSuffix = prerelease ? `-${prerelease}` : '';
    // If a prelease value is defined, append it to the version string (e.g., '0.2.0-alpha').
    const version = currentVersion + versionSuffix;
    // Add to the versions object.
    versions[packageName] = version;
  }

  return versions;
}

/**
 * Parses the command-line arguments provided to the script and returns
 * them as a configuration object.
 *
 * The function expects arguments in the format of '--key=value' and extracts
 * them into key-value pairs stored within the configuration object. This allows
 * for flexible configuration of the script's behavior via the command line.
 *
 * @param {string[]} argv - An array of command-line arguments passed to the script.
 * @returns {Record<string, string>} An object mapping argument names to their
 * corresponding values.
 *
 * @example
 *
 * const config = parseCliArguments(['--prerelease=alpha']);
 * // Returns: { prerelease: 'alpha' }
 */
function parseCliArguments(argv) {
  const config = {};
  argv.forEach((arg) => {
    if (arg.startsWith('--')) {
      // Remove the '--' prefix.
      const argWithoutPrefix = arg.substring(2);
      // Split argName=argValue.
      const [argName, argValue] = argWithoutPrefix.split('=');
      // Store in config object.
      config[argName] = argValue;
    }
  });

  return config;
}

/**
 * Updates dependencies of the workspaces to the latest versions and updates
 * the version of the package itself.
 *
 * This function iterates through the provided workspaces and updates both
 * regular dependencies and devDependencies to their latest versions. Additionally,
 * it updates the version of the package itself according to the corresponding
 * entry in the `packageVersions` object.
 *
 * @param {string[]} workspaces - An array of workspace paths.
 * @param {Record<string, string>} packageVersions - An object mapping package
 * names to their latest versions.
 */
async function updateDependencies(workspaces, packageVersions) {
  for (const workspace of workspaces) {
    const packageJson = await PackageJson.load(workspace);

    const version = packageVersions[packageJson.content.name];
    const dependencies = packageJson.content.dependencies ?? [];
    const devDependencies = packageJson.content.devDependencies ?? [];

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
    packageJson.update({ version, dependencies, devDependencies });
    await packageJson.save();
  }
}

/**
 * Each time the script is executed, the `version` string is
 * read from each package.json file and web5/* dependency
 * versions, if any, are updated.
 */
async function main() {
  const config = parseCliArguments(process.argv);
  const workspaces = await getWorkspaces();
  const packageVersions = await getPackageVersions(workspaces, config.prerelease);
  await updateDependencies(workspaces, packageVersions);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});