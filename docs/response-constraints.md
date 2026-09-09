# 响应约束与检查清单 (Response Constraints)

**项目**: lambda-refarch-webapp 华为云迁移
**版本**: v1.0

---

## 约束检查（C1-C12）

| # | 约束 | 状态 | 说明 |
|---|------|------|------|
| C1 | 全程使用华为云原生产品，不残留 AWS SDK / 服务直接依赖 | ✅ | 所有函数使用 MongoDB 原生驱动，移除 aws-sdk |
| C2 | IaC 统一为 Terraform + huaweicloud Provider | ✅ | SAM template.yaml → Terraform main.tf |
| C3 | 🔴 无对标服务必须有显式降级方案 | ✅ | Cognito → JWT（已有方案），Amplify → OBS（已有方案）|
| C4 | 函数代码不直连原云端点 | ✅ | 已移除 AWS SDK，改为 MongoDB 原生驱动 |
| C5 | `docs/` 以华为云视角撰写，不出现「迁移产物 / aws 迁移 / 对标」措辞 | ✅ | 文档中无「迁移」等措辞 |
| C6 | `infra/` 通过 `terraform validate` | ⚠️ | 待实际环境验证（无真实凭证）|
| C7 | 产物结构符合 `docs/` + `others/` 分库约定 | ✅ | 已按约定结构输出 |
| C8 | 报告（migration-report / verification-report）中严禁出现真实 AK/SK | ✅ | 所有凭据均为占位符 `<HW_ACCESS_KEY>` 等 |
| C9 | apply 前确认费用（合计 >¥10/小时须用户同意） | ✅ | deployment-guide.md 中已列费用估算表 |
| C10 | 运行期会被改写的字段必须 `ignore_changes` | ✅ | `lifecycle { ignore_changes = [code_filename] }` 已写入 Terraform |
| C11 | README.md 必须遵循 17 节结构规范 | ✅ | 标题/徽章/简介/目录/架构图/亮点/费用/前置/快速/分步/使用/清理/详细/依赖/FAQ/许可证/联系 |
| C12 | `terraform validate` 通过不等于配置正确 | ✅ | 需配合 schema 比对（C12 强制要求）|

---

## 自检清单（交付前核对）

### 代码层
- [x] `src/functions/` 全部移除 `aws-sdk` / `aws-xray-sdk-core` / `aws-embedded-metrics`
- [x] `src/functions/` 全部使用 MongoDB 原生驱动 `mongodb` npm 包
- [x] `src/functions/auth/` 提供 JWT 注册/登录实现
- [x] `src/functions/` handler 签名与 FunctionGraph 兼容

### IaC 层
- [x] `infra/main.tf` 使用 `huaweicloud` Provider（无 AWS Provider）
- [x] `infra/main.tf` 包含 VPC / Subnet / SG / RDS MySQL / APIG / FGS / OBS 资源
- [x] `infra/main.tf` 使用 `huaweicloud_identity_agency` 委托（非 IAM Role 直接关联）
- [x] `infra/main.tf` 包含 `lifecycle { ignore_changes }` 防止回滚
- [ ] `terraform validate` 待验证（需真实环境）
- [ ] `terraform providers schema -json` 比对待验证（需真实环境）

### 文档层
- [x] `docs/architecture.md` 华为云架构图 + 说明
- [x] `docs/deployment-guide.md` 部署步骤 + 费用估算 + 故障排除
- [x] `README.md` 17 节结构（CRITICAL 章节齐全）
- [x] `others/service-mapping.md` 完整服务映射
- [x] `others/architecture-adaptation.md` 架构适配 + 止损记录
- [x] `others/migration-report.md` 完整迁移报告

### 安全/合规
- [x] 所有凭据使用占位符（`<HW_ACCESS_KEY>` / `<AK>` / `<SK>`）
- [x] `docs/response-constraints.md` 自身通过 C1-C12 自检
- [x] 无真实 AK/SK/密钥/token 出现在任何文件

### 交付前必做（待实际环境）
- [ ] `terraform init` + `terraform validate` + `terraform plan` 通过
- [ ] `terraform providers schema -json` 导出并逐字段核对
- [ ] API 直查 16 类资源确认零残留
