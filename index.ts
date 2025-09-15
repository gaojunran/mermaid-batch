#!/usr/bin/env bun
import { Command } from "commander";
import {
	listFiles,
	processFile,
	// fixupFiles,
	generateMarkdown,
	readConfigToml,
} from "./lib";
import OpenAI from "openai";
import path from "node:path";

async function main() {
	const config = await readConfigToml();

	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
		baseURL: config?.base_url ?? "https://api.openai.com/v1",
	});

	const model = config?.model ?? "glm-4.5-flash";

	const patterns = config?.scan_patterns ?? [];
	const cwd = path.resolve(config?.scan_path ?? ".");
	const prompt =
		config?.prompt ??
		"Generate mermaid class diagram code based on the following file. Your output should only contain mermaid code, without any markdown tags like ``` etc.";
	const rewrites = config?.rewrites ?? [];
	const output = path.resolve(config?.output_path ?? "./output");

	const program = new Command();

	program
		.command("ls")
		.description("list all files that match the patterns")
		.action(async () => {
			const files = await listFiles(patterns, cwd);
			console.log(files.join("\n"));
		});

	program
		.command("generate")
		.description("generate mermaid diagrams (code & images) from source files")
		.action(async () => {
			try {
				const files = await listFiles(patterns, cwd);
				for (const file of files) {
					await processFile(
						openai,
						model,
						file,
						files.length,
						cwd,
						prompt,
						rewrites,
						output,
					);
				}
			} catch (err) {
				console.error("Error generating files:", err);
			}
		});

	// program
	// 	.command("fixup")
	// 	.description(
	// 		"Fixup missing png files after you manually edit the .mmd files",
	// 	)
	// 	.action(async () => {
	// 		await fixupFiles(output);
	// 	});

	program
		.command("md")
		.description("Generate a markdown file to index all the diagrams")
		.action(async () => {
			await generateMarkdown(output, path.join(output, "diagrams.md"));
		});

	program.parseAsync();
}

main();
