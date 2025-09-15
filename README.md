# mermaid-batch

基于 mermaid 和大模型 API，生成令人讨厌的类图（[class diagram](https://mermaid.js.org/syntax/classDiagram.html)）报告。

## 说明 📢

本项目并不直接生产可用（production-ready），因为作者本人只使用一次这个脚本，并不打算保持其长期可用性。如果你想定制自己的需求，请 fork 这个仓库并自己修改代码。

## 使用方法 📚

1. 安装 [bun](https://bun.sh) 和 [mermaid-cli](https://github.com/mermaid-js/mermaid-cli)。

2. 克隆此仓库，并修改 `config.toml` 文件。

3. 导出 `OPENAI_API_KEY` 环境变量。如果您的文件数较多，建议使用免费的大模型端口如 [glm-4.5-flash](https://bigmodel.cn/)。

4. 在本仓库文件夹中运行 `bun run index.ts <subcommand>`：

子命令可以是：

- `ls`：列出 glob 匹配的所有文件。
- `generate`：生成 mermaid 代码和对应的图片。因为大模型输出结果不稳定，可能存在 mermaid code 无法编译通过生成图片的情况。这时你可以手动修改 `.mmd` 文件使之能编译通过，再运行 `generate` 生成未被生成的图片。
- `md`：生成 markdown 文件，包含所有图片。

## FAQ ❓

#### 我遇到了大模型速率问题，怎么办？

你可以手动在代码里补充延时逻辑。也可以暂时反复多次运行 `generate` 子命令直到所有图片都成功生成。

#### 大模型总是错误输出一些 mermaid 语法，怎么办？

你可以在 `config.toml` 中编写 `rewrites` 参数，以正则表达式的方式替换错误的语法。

也可以在 `config.toml` 中的 `prompt` 中添加提示信息，提示大模型规避这种错误。
