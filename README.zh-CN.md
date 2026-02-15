# Ant Design Vue MCP（中文）

这是一个用于 **Ant Design Vue** 文档的 MCP（Model Context Protocol）服务，提供文档检索与组件 API 查询能力，方便 AI 助手快速获取准确资料。

## 前置要求

- Node.js >= 20
- pnpm

## 最简配置（推荐）

### 1. 安装依赖并构建

```bash
pnpm install
pnpm build
```

### 2. 生成文档索引数据库

```bash
# 同时索引 v3 + v4
pnpm index:all
```

索引完成后会在仓库根目录生成数据库文件：`./data/antdv.sqlite`（已在 `.gitignore` 中忽略）。

### 3. 配置 MCP（以 VS Code + Roo-Cline 为例）

编辑配置文件：
`~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "antdv": {
      "command": "node",
      "args": [
        "/absolute/path/to/antdv-mcp/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "ANTDV_DB_PATH": "/absolute/path/to/antdv-mcp/data/antdv.sqlite"
      }
    }
  }
}
```

> **注意**：路径必须使用绝对路径。可参考 `docs/mcp-config-example.json`。

## 最小可用工具说明

配置完成后即可在 MCP 中使用：

- `adv_search_docs`：全文搜索文档
- `adv_list_components`：列出组件
- `adv_get_component_api`：获取组件 API（Props/Events/Slots/Methods）
- `adv_find_prop`：按属性名称查找 API

如果遇到数据库不存在或服务未生效，请先运行 `pnpm index:all` 并确认 `pnpm build` 成功后重启 VS Code。
