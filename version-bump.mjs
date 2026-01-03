import fs from "fs";
import { exec } from "child_process";

// Read the version from the package.json file
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const newVersion = packageJson.version;

// Update the manifest.json file
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf-8"));
manifest.version = newVersion;
fs.writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// Update the versions.json file
const versions = JSON.parse(fs.readFileSync("versions.json", "utf-8"));
versions[newVersion] = manifest.minAppVersion;
fs.writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

// Add the updated files to git
exec("git add manifest.json versions.json", (err, stdout, stderr) => {
	if (err) {
		console.error(`Error adding files to git: ${err}`);
		return;
	}
	console.log("manifest.json and versions.json have been updated and added to git.");
});
