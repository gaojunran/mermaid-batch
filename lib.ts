import fg from "fast-glob";
import fs, { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import type OpenAI from "openai";
import toml from "toml";

interface Config {
	base_url: string;
	model: string;
	prompt: string;
	scan_path: string;
	scan_patterns: string[];
	output_path: string;
}

function fileExists(filePath: string) {
	try {
    const stat = statSync(path.resolve(filePath));
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function readConfigToml(
	cwd = process.cwd(),
): Promise<Config | null> {
	const configPath = path.join(cwd, "config.toml");

	try {
		const content = await readFile(configPath, "utf-8");
		const parsed = toml.parse(content);
		return parsed;
	} catch (err) {
		console.error(`Failed to read from config.toml: `, err);
		return null;
	}
}

export async function listFiles(
	pattern: string | string[],
	cwd = ".",
): Promise<string[]> {
	return fg(pattern, { cwd, onlyFiles: true });
}

export async function processFile(
	openai: OpenAI,
	model: string,
	filePath: string,
	count: number,
	cwd: string,
	prompt: string,
	output: string,
) {
	try {
		console.log(
			`Processing file ${(await fg("*.mmd", { cwd: output })).length + 1}/${count}: ${filePath}`,
		);

		const fullPath = path.join(cwd, filePath);

		const newFilePath = path.join(
			output,
			filePath.replace(/\//g, "~").replace(/\.[^/.]+$/, "") + ".mmd",
		);

		if (!fileExists(newFilePath)) {
			const content = await fs.readFile(fullPath, "utf-8");

			const response = await openai.chat.completions.create({
				model: model,
				messages: [
					{ role: "system", content: "You are a helpful assistant." },
					{ role: "user", content: `${prompt}\n\n${content}` },
				],
			});
			let result = response.choices[0]?.message?.content ?? "";
      result = result.replace(/```mermaid/g, "").replace(/```/g, "").trim();

			await fs.writeFile(newFilePath, result, "utf-8");
			console.log(`Generated: ${newFilePath}`);
		} else {
			console.log(`File already exists: ${newFilePath}`);
		}

		await generateImage(newFilePath);
	} catch (err) {
		console.error(`Error processing file ${filePath}:`, err);
	}
}

async function generateImage(file: string) {
	const pngFileName = file.replace(/\.mmd$/, ".png");
  if (fileExists(pngFileName)) {
    console.log(`PNG already exists: ${pngFileName}`);
    return;
  }
	await new Promise<void>((resolve, reject) => {
		exec(`mmdc -i "${file}" -o "${pngFileName}"`, (error, _, stderr) => {
			if (error) {
				console.error(`Error generating PNG for ${file}:`, stderr);
				reject(error);
			} else {
				console.log(`Generated PNG: ${pngFileName}`);
				resolve();
			}
		});
	});
}

// export async function fixupFiles(output: string) {
// 	const mmdFiles = await fg("**/*.mmd", { cwd: output, onlyFiles: true });

// 	for (const file of mmdFiles) {
// 		const baseName = file.slice(0, -4);
// 		const pngFile = `${baseName}.png`;
// 		const pngPath = path.join(output, pngFile);

// 		try {
// 			await fs.access(pngPath);
// 		} catch {
// 			const mmdPath = path.join(output, file);
// 			await generateImage(mmdPath, output);
// 		}
// 	}
// }

export async function generateMarkdown(dir: string, outputMd: string) {
	const files = await fg("**/*.png", { cwd: dir, onlyFiles: true });

	const lines: string[] = [];

	for (const file of files) {
		const baseName = path.basename(file, ".png").replace(/~/g, "/");

		lines.push(`## ${baseName}`);
		lines.push(`![${baseName}](${file})`);
		lines.push("");
	}

	const mdContent = lines.join("\n");

	await fs.writeFile(outputMd, mdContent, "utf-8");
	console.log(`Markdown generated: ${outputMd}`);
}
