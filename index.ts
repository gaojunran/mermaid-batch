// file-list.ts
import fg from 'fast-glob';

async function listFiles(pattern: string | string[], cwd = '.') : Promise<string[]> {
  const entries = await fg(pattern, { cwd, onlyFiles: true });
  // 若要返回绝对路径，可以加 absolute: true
  return entries;
}

async function main() {
  const pattern = '**/*.java';  // 根据你的需求改 glob 模式
  const cwd = '../online_exam/exam-springboot';        // 从哪个目录开始查
  try {
    const files = await listFiles(pattern, cwd);
    console.log(files);
  } catch (err) {
    console.error('Error listing files:', err);
  }
}

main();
