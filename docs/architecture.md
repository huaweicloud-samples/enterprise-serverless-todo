# 华为云架构说明 (Architecture)

## 一、架构概述

本项目是基于华为云 FunctionGraph + APIG + RDS MySQL 构建的无服务器 Todo 应用，采用事件驱动架构，前端通过 APIG 调用后端函数，数据持久化到 RDS MySQL（MongoDB 兼容）。

**核心特性**：
- 无服务器（Serverless）函数计算，零运维
- RESTful API 通过 APIG 暴露
- JWT 认证
- MongoDB 兼容接口存储
- OBS 静态网站托管（替代 Amplify Console）

---

## 二、架构图

```
┌─────────────────────────────────────────────────────────┐
│                     浏览器用户                            │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│              OBS 静态网站托管                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │  index.html + React App (build产物)             │    │
│  └─────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────┘
                        │ fetch /auth/* , /item/*
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   APIG API 网关                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  REST API (HTTPS)                               │    │
│  │  /auth/* (注册/登录, 无认证)                      │    │
│  │  /item/* (Todo CRUD, JWT认证)                   │    │
│  └─────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────┘
                        │ 函数触发
        ┌───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ getTodo       │ │ getAllTodo    │ │ addTodo       │ │ updateTodo    │
│ FunctionGraph │ │ FunctionGraph │ │ FunctionGraph │ │ FunctionGraph │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │                 │
        └─────────────────┼─────────────────┼─────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 RDS MySQL (MongoDB)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Collection: todos                              │    │
│  │  主键: cognito-username (分区) + id (排序)        │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Collection: users (认证)                       │    │
│  │  { email, password (bcrypt hash) }              │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 三、网络架构

```
[VPC: 10.0.0.0/16]
├── 子网: 10.0.1.0/24 (可用区 A)
│   ├── APIG 实例 (内网访问)
│   ├── FunctionGraph 函数 (VPC 访问)
│   └── RDS MySQL 副本集节点 × 3
│
└── 安全组: todo-sg (仅允许 8635 端口从 VPC 内访问)
```

---

## 四、数据模型

### todos collection

| 字段 | 类型 | 说明 |
|------|------|------|
| `cognito-username` | String | 用户标识（分区键）等效原 Cognito username |
| `id` | String | Todo 项唯一 ID（排序键） |
| `title` | String | Todo 标题 |
| `completed` | Boolean | 是否完成 |
| `creation_date` | String (ISO8601) | 创建时间 |
| `lastupdate_date` | String (ISO8601) | 更新时间 |

### users collection (Cognito UserPool 替代)

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | ObjectId | MongoDB 自动 ID |
| `email` | String | 用户邮箱（唯一索引） |
| `password` | String | bcrypt 哈希后的密码 |
| `created_at` | String (ISO8601) | 注册时间 |

---

## 五、API 端点

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

---

## 六、技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端 | React (create-react-app) | 静态托管于 OBS |
| API 网关 | APIG | REST API，JWT 认证 |
| 函数计算 | FunctionGraph | Node.js 18 运行时 |
| 数据库 | RDS MySQL (MongoDB 4.0) | 副本集高可用 |
| 存储 | OBS | 前端静态资源 + 构建产物 |
| IaC | Terraform + huaweicloud Provider | 基础设施即代码 |
| 日志 | LTS (日志接入服务) | FunctionGraph 日志收集 |
| 监控 | AOM (应用性能管理) | 指标与告警 |
