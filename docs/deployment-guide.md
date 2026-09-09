# 华为云部署指导书 (Deployment Guide)

## 一、前置条件

### 1.1 账号与权限
- 华为云账号（已实名认证）
- 具有以下服务权限：
  - VPC / VPCEP（创建虚拟私有云）
  - APIG（创建 API 网关）
  - FunctionGraph（创建函数）
  - RDS MySQL（创建数据库实例）
  - OBS（创建存储桶）
  - IAM（创建委托）
  - LTS / AOM（日志与监控）

### 1.2 工具安装

```bash
# Terraform >= 1.0
terraform version

# 华为云 CLI
# https://support.huaweicloud.com/manuals/cli/cls/cloudshellcli_0001.html
hwcloud cli version

# Node.js >= 18 (本地构建函数包)
node --version
npm --version
```

### 1.3 环境变量

```bash
export HW_ACCESS_KEY="<您的华为云 Access Key>"
export HW_SECRET_KEY="<您的华为云 Secret Key>"
export HW_REGION="cn-north-4"  # 北京四
```

---

## 二、基础设施部署（Terraform）

### 2.1 初始化

```bash
cd infra/

# 初始化 Terraform（自动下载 huaweicloud provider）
terraform init
```

### 2.2 规划预览

```bash
# 预览将创建的资源（不实际创建）
terraform plan \
  -var="hw_region=${HW_REGION}" \
  -var="jwt_secret=${TF_VAR_jwt_secret}" \
  -var="stage_name=prod"
```

预期输出：
```
Plan: 22 to add, 0 to change, 0 to destroy.
```

### 2.3 执行部署

```bash
# 部署所有资源
terraform apply \
  -var="hw_region=${HW_REGION}" \
  -var="jwt_secret=${TF_VAR_jwt_secret}" \
  -var="stage_name=prod"

# 输入 yes 确认
```

### 2.4 获取输出

```bash
terraform output

# 预期输出：
# api_gateway_url = "https://<instance_id>.apigateway.cn-north-4.myhuaweicloud.com"
# obs_bucket_name = "todo-frontend-prod-cn-north-4"
```

---

## 三、函数代码部署

### 3.1 构建函数包

```bash
cd ../src/functions/

# 安装依赖
npm install

# 创建部署 zip 包（包含所有 6 个函数的代码）
cd ../
zip -r ../infra/functions.zip functions/ -x "*/node_modules/*"
```

> ⚠️ 注意：实际部署时需将 `node_modules` 包含在 zip 中，此处为示例。

### 3.2 上传函数包到 OBS

```bash
# 通过华为云控制台或 OBS CLI 上传
obs-cli put functions.zip --bucket <obs_bucket_name>
```

### 3.3 函数环境变量

部署后需在 FunctionGraph 控制台为每个函数配置以下环境变量：

| 环境变量 | 值 |
|---------|---|
| `DB_URI` | `mongodb://<user>:<password>@<gemini_db_private_ip>:8635/todoapp` |
| `TABLE_NAME` | `todos` |
| `JWT_SECRET` | `<您设置的 JWT 密钥>` |
| `REGION` | `cn-north-4` |
| `NODE_ENV` | `production` |

---

## 四、API 绑定函数

部署 APIG API 时需将每个 API 绑定到对应的 FunctionGraph 函数：

1. 登录华为云控制台 → API Gateway (APIG)
2. 选择实例 → API 管理
3. 点击每个 API → 后端配置 → 选择对应的 FunctionGraph 函数
4. 配置请求路径参数映射（如 `{id}` → 函数 event.pathParameters.id）
5. 保存并发布

---

## 五、前端部署

### 5.1 配置前端

```bash
cd src/frontend/www/src/

# 复制配置模板
cp config.default.js config.js

# 编辑 config.js，填入实际的 API 地址
```

### 5.2 构建

```bash
cd src/frontend/www/
npm install
npm run build
```

### 5.3 上传到 OBS

```bash
# 使用 OBS CLI 或控制台上传 build/ 目录内容到 OBS 桶
obs-cli put build/* --bucket <obs_bucket_name> --recursive
```

### 5.4 配置静态网站托管

在 OBS 控制台开启静态网站托管：
- 默认首页：`index.html`
- 错误页面：`index.html`

---

## 六、验证部署

### 6.1 测试认证 API

```bash
# 注册用户
curl -X POST https://<api_gateway_url>/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# 登录获取 token
curl -X POST https://<api_gateway_url>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

### 6.2 测试 Todo API

```bash
TOKEN="<从登录获取的 JWT token>"

# 创建 Todo
curl -X POST https://<api_gateway_url>/item \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title":"Test Todo","completed":false}'

# 获取所有 Todo
curl https://<api_gateway_url>/item \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 七、清理资源

```bash
# 销毁所有 Terraform 管理的资源
cd infra/
terraform destroy \
  -var="hw_region=${HW_REGION}" \
  -var="jwt_secret=${TF_VAR_jwt_secret}" \
  -var="stage_name=prod"

# 输入 yes 确认

# 手动删除 OBS 桶中的前端文件（Terraform 不会自动删除桶内文件）
```

---

## 八、故障排除

### 8.1 函数调用失败 (502/503)

1. 检查函数是否正确绑定到 APIG 后端
2. 检查函数环境变量 `DB_URI` 是否正确
3. 检查 RDS MySQL 安全组是否允许函数所在 VPC 访问端口 8635
4. 查看函数日志（FunctionGraph → 日志 → LTS）

### 8.2 认证失败 (401)

1. 检查请求 header 是否包含 `Authorization: Bearer <token>`
2. 检查 APIG 是否配置了 JWT 认证
3. 检查 JWT secret 是否与登录时一致

### 8.3 前端无法访问

1. 检查 OBS 桶的 CORS 配置
2. 检查静态网站托管是否开启
3. 检查 OBS 桶 ACL 是否为 public-read
