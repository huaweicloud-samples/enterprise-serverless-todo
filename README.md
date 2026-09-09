# Serverless Todo App on Huawei Cloud

![License](https://img.shields.io/badge/License-Apache%202.0-blue)
![Platform](https://img.shields.io/badge/Platform-Huawei%20Cloud-green)
![Node.js](https://img.shields.io/badge/Node.js-18-brightgreen)

## 简介

基于华为云 FunctionGraph + APIG + RDS MySQL 构建的无服务器 Todo 应用。采用事件驱动架构，前端通过 APIG 调用后端函数，数据持久化到 RDS MySQL（MongoDB 兼容），JWT 实现用户认证。

适用于需要快速构建 Serverless Web 应用的企业开发者。

## 目录

- [架构图](#架构图)
- [方案亮点](#方案亮点)
- [涉及云服务](#涉及云服务)
- [前置条件](#前置条件)
- [快速开始](#快速开始)
- [分步部署](#分步部署)
- [使用方法](#使用方法)
- [清理资源](#清理资源)
- [详细说明](#详细说明)
- [依赖与致谢](#依赖与致谢)
- [FAQ](#faq)
- [许可证](#许可证)
- [联系方式](#联系方式)

---

## 架构图

```
[浏览器] 
  │ HTTPS
  ▼
[OBS 静态托管前端] ──fetch──> [APIG REST API]
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
        /auth/*                   /item/* (JWT认证)
              │                        │
      [认证函数]               [6个 Todo 函数]
              │                        │
              │                        ▼
              │              [RDS MySQL MongoDB]
              │                  todos / users
              └──────────────────────────────────────────────┘
```

---

## 方案亮点

- **零服务器运维**：FunctionGraph 无服务器函数计算，无需管理服务器
- **弹性伸缩**：函数级别自动伸缩
- **高可用架构**：RDS MySQL 副本集（3节点）保障数据高可用
- **JWT 无状态认证**：无会话管理，横向扩展无瓶颈
- **Terraform IaC**：基础设施即代码，版本化管理，可重复部署

---

## 前置条件

### 账号与权限
- 华为云账号（已实名认证）
- 具有 APIG / FunctionGraph / RDS MySQL / OBS / IAM 服务权限

### 工具
- Terraform >= 1.0
- Node.js >= 18（本地构建函数包）
- 华为云 CLI（可选）

### 环境变量
```bash
export HW_ACCESS_KEY="<您的 Access Key>"
export HW_SECRET_KEY="<您的 Secret Key>"
export HW_REGION="cn-north-4"  # 北京四
```

---

## 快速开始

### 一键部署

```bash
cd infra/
terraform init
terraform plan \
  -var="hw_region=${HW_REGION}" \
  -var="jwt_secret=<32位以上随机字符串>" \
  -var="stage_name=prod"
terraform apply
```

### 获取部署输出

```bash
terraform output
# api_gateway_url = "https://<instance_id>.apigateway.cn-north-4.myhuaweicloud.com"
# obs_bucket_name = "todo-frontend-prod-cn-north-4"
```

---

## 分步部署

### 1. 部署基础设施

```bash
cd infra/
terraform init
terraform apply -var="hw_region=cn-north-4" -var="jwt_secret=<密钥>" -var="stage_name=prod"
```

### 2. 构建并部署函数

```bash
cd ../src/functions/
npm install
# 将 node_modules 和代码打包上传到 FunctionGraph
```

### 3. 绑定 API 到函数

在 APIG 控制台将每个 API 绑定到对应的 FunctionGraph 函数。

### 4. 部署前端

```bash
cd src/frontend/www/
npm install && npm run build
# 将 build/ 内容上传到 OBS 桶
```

---

## 使用方法

### 测试认证

```bash
# 注册
curl -X POST https://<api_gateway_url>/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# 登录
curl -X POST https://<api_gateway_url>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

### Todo CRUD

```bash
TOKEN="<JWT token>"

# 创建 Todo
curl -X POST https://<api_gateway_url>/item \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title":"我的第一个 Todo","completed":false}'

# 获取所有 Todo
curl https://<api_gateway_url>/item \
  -H "Authorization: Bearer ${TOKEN}"

# 更新 Todo
curl -X PUT https://<api_gateway_url>/item/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title":"更新后的标题"}'

# 标记完成
curl -X POST https://<api_gateway_url>/item/<id>/done \
  -H "Authorization: Bearer ${TOKEN}"

# 删除 Todo
curl -X DELETE https://<api_gateway_url>/item/<id> \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 清理资源

```bash
cd infra/
terraform destroy -var="hw_region=cn-north-4" -var="jwt_secret=<密钥>" -var="stage_name=prod"
```

---

## 详细说明

### API 端点

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/auth/register` | 无 | 用户注册 |
| POST | `/auth/login` | 无 | 用户登录，获取 JWT |
| GET | `/item` | JWT | 获取当前用户所有 Todo |
| GET | `/item/{id}` | JWT | 获取单个 Todo |
| POST | `/item` | JWT | 创建新 Todo |
| PUT | `/item/{id}` | JWT | 更新 Todo |
| POST | `/item/{id}/done` | JWT | 标记 Todo 完成 |
| DELETE | `/item/{id}` | JWT | 删除 Todo |

### 数据模型

**todos collection**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `cognito-username` | String | 用户标识（分区键）|
| `id` | String | Todo 唯一 ID（排序键）|
| `title` | String | Todo 标题 |
| `completed` | Boolean | 是否完成 |
| `creation_date` | String | 创建时间 |
| `lastupdate_date` | String | 更新时间 |

### 环境变量

| 变量 | 说明 |
|------|------|
| `DB_URI` | MongoDB 连接串 |
| `TABLE_NAME` | 集合名（todos）|
| `JWT_SECRET` | JWT 签名密钥 |
| `REGION` | 区域 |
| `NODE_ENV` | 环境（production）|

---

## 依赖与致谢

### 主要依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| mongodb | ^4.17.0 | MongoDB 原生驱动 |
| uuid | ^9.0.0 | UUID 生成 |
| jsonwebtoken | ^9.0.2 | JWT 签发与验证 |
| bcryptjs | ^2.4.3 | 密码哈希 |

### 致谢

- 原始架构参考 [aws-samples/lambda-refarch-webapp](https://github.com/aws-samples/lambda-refarch-webapp)
- 华为云 Terraform Provider [huaweicloud/huaweicloud](https://registry.terraform.io/providers/huaweicloud/huaweicloud)

---

## FAQ

### Q: 函数调用返回 502 怎么办？
A: 检查：1) 函数是否正确绑定到 APIG；2) RDS MySQL 安全组是否允许 VPC 访问端口 8635；3) 函数环境变量 `DB_URI` 是否正确。

### Q: 认证失败 (401) 怎么排查？
A: 确认：1) 请求 header 包含 `Authorization: Bearer <token>`；2) JWT secret 与登录时一致；3) Token 未过期（默认 7 天）。

### Q: 前端无法访问？
A: 检查：1) OBS 桶 CORS 配置；2) 静态网站托管已开启；3) 桶 ACL 为 public-read。

---

## 许可证

MIT No Attribution - Copyright (c) 2026 Huawei Cloud

---

## 联系方式

- **维护者**：
- **反馈**：欢迎提交 Issue 或 Pull Request
