// file-list.ts
import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.GLM_API_KEY, baseURL: 'https://open.bigmodel.cn/api/paas/v4/' });

async function listFiles(pattern: string | string[], cwd = '.'): Promise<string[]> {
  return fg(pattern, { cwd, onlyFiles: true });
}

async function processFile(filePath: string, cwd: string, prompt: string, output: string) {
  try {
    const fullPath = path.join(cwd, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    // 调用 OpenAI
    const response = await openai.chat.completions.create({
      model: 'glm-4.5-flash',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: `${prompt}\n\n${content}` },
      ],
    });

    const result = response.choices[0]?.message?.content ?? '';

    // 生成新文件名
    const newFileName = filePath.replace(/\//g, '~').replace(/\.[^/.]+$/, '') + '.mmd';
    await fs.writeFile(path.join(output, newFileName), result, 'utf-8');
    console.log(`Generated: ${newFileName}`);

    await generateImage(newFileName, output);

  } catch (err) {
    console.error(`Error processing file ${filePath}:`, err);
  }
}

async function generateImage(file: string, output: string) {
  const pngFileName = file.replace(/\.mmd$/, '.png');
  await new Promise<void>((resolve, reject) => {
    exec(`mmdc -i "${file}" -o "${pngFileName}"`, (error, stdout, stderr) => {
      if (error){
        console.error(`Error generating PNG for ${file}:`, stderr);
        reject(error);
      } else {
        console.log(`Generated PNG: ${pngFileName}`);
        resolve();
      }
    })
  })
}

async function fixupFiles(output: string) {
  const mmdFiles = await fg('**/*.mmd', { cwd: output, onlyFiles: true });

  for (const file of mmdFiles) {
    const baseName = file.slice(0, -4); // 去掉 .mmd 后缀
    const pngFile = `${baseName}.png`;
    const pngPath = path.join(output, pngFile);

    try {
      await fs.access(pngPath);
      // 如果存在，什么都不做
    } catch {
      // 不存在则生成
      const mmdPath = path.join(output, file);
      await generateImage(mmdPath, output);
    }
  }
}

async function generateMarkdownFromPng(dir: string, outputMd: string) {
  // 使用 fast-glob 获取所有 png 文件（相对路径）
  const files = await fg('**/*.png', { cwd: dir, onlyFiles: true });

  const lines: string[] = [];

  for (const file of files) {
    // 处理标题：去掉扩展名 + 波浪线替换为 /
    const baseName = path.basename(file, '.png').replace(/~/g, '/');

    lines.push(`## ${baseName}`);
    lines.push(`![${baseName}](${file})`);
    lines.push(''); // 添加空行分隔
  }

  // 拼接成 Markdown 内容
  const mdContent = lines.join('\n');

  // 写入文件
  await fs.writeFile(outputMd, mdContent, 'utf-8');
  console.log(`Markdown 已生成: ${outputMd}`);
}

async function main() {
  const patterns = ['**/*.java'];
  const cwd = '../online_exam/exam-springboot';
  const prompt = '请基于以下 Java 文件生成 mermaid 类图代码，你的输出中应该仅包含 mermaid 代码，不要包括 markdown 的标记，如 ``` 等:';
  const output = './output'

  try {
    const files = await listFiles(patterns, cwd);
    for (const file of files) {
      await processFile(file, cwd, prompt, output);
    }
  } catch (err) {
    console.error('Error listing files:', err);
  }
}

main();
