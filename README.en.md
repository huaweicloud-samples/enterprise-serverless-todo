# Serverless Todo App on Huawei Cloud

![License](https://img.shields.io/badge/License-Apache%202.0-blue)
![Platform](https://img.shields.io/badge/Platform-Huawei%20Cloud-green)
![Node.js](https://img.shields.io/badge/Node.js-18-brightgreen)

## Overview

A serverless Todo application built on Huawei Cloud FunctionGraph + APIG + RDS MySQL. Using event-driven architecture, the frontend calls backend functions via APIG, with data persisted to RDS MySQL (MongoDB compatible) and JWT for user authentication.

Suitable for developers who need to quickly build Serverless Web applications.

## Table of Contents

- [Architecture](#architecture)
- [Highlights](#highlights)
- [Cloud Services](#cloud-services)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Usage](#usage)
- [Cleanup](#cleanup)
- [Detailed Documentation](#detailed-documentation)
- [Dependencies and Credits](#dependencies-and-credits)
- [FAQ](#faq)
- [License](#license)
- [Contact](#contact)

---

## Architecture

```
[Browser]
  │ HTTPS
  ▼
[OBS Static Frontend] ──fetch──> [APIG REST API]
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
        /auth/*                   /item/* (JWT Auth)
              │                        │
      [Auth Functions]         [6 Todo Functions]
              │                        │
              │                        ▼
              │              [RDS MySQL MongoDB]
              │                  todos / users
              └──────────────────────────────────────────────┘
```

---

## Highlights

- **Zero Server Operations**: FunctionGraph serverless computing, no server management required
- **Auto Scaling**: Function-level automatic scaling
- **High Availability**: RDS MySQL replica set (3 nodes) ensures data high availability
- **Stateless JWT Authentication**: No session management, unlimited horizontal scaling
- **Terraform IaC**: Infrastructure as Code, version managed, repeatable deployments

---

## Prerequisites

### Account & Permissions
- Huawei Cloud account (verified)
- APIG / FunctionGraph / RDS MySQL / OBS / IAM service permissions

### Tools
- Terraform >= 1.0
- Node.js >= 18 (for building function packages locally)
- Huawei Cloud CLI (optional)

### Environment Variables
```bash
export HW_ACCESS_KEY="<your Access Key>"
export HW_SECRET_KEY="<your Secret Key>"
export HW_REGION="cn-north-4"  # Beijing 4
```

---

## Quick Start

### One-Click Deployment

```bash
cd infra/
terraform init
terraform plan \
  -var="hw_region=${HW_REGION}" \
  -var="jwt_secret=<32+ random string>" \
  -var="stage_name=prod"
terraform apply
```

### Get Deployment Output

```bash
terraform output
# api_gateway_url = "https://<instance_id>.apigateway.cn-north-4.myhuaweicloud.com"
# obs_bucket_name = "todo-frontend-prod-cn-north-4"
```

---

## Step-by-Step Deployment

### 1. Deploy Infrastructure

```bash
cd infra/
terraform init
terraform apply -var="hw_region=cn-north-4" -var="jwt_secret=<secret>" -var="stage_name=prod"
```

### 2. Build and Deploy Functions

```bash
cd ../src/functions/
npm install
# Package node_modules and code, upload to FunctionGraph
```

### 3. Bind APIs to Functions

In the APIG console, bind each API to the corresponding FunctionGraph function.

### 4. Deploy Frontend

```bash
cd src/frontend/www/
npm install && npm run build
# Upload build/ contents to OBS bucket
```

---

## Usage

### Test Authentication

```bash
# Register
curl -X POST https://<api_gateway_url>/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Login
curl -X POST https://<api_gateway_url>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

### Todo CRUD

```bash
TOKEN="<JWT token>"

# Create Todo
curl -X POST https://<api_gateway_url>/item \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title":"My First Todo","completed":false}'

# Get All Todos
curl https://<api_gateway_url>/item \
  -H "Authorization: Bearer ${TOKEN}"

# Update Todo
curl -X PUT https://<api_gateway_url>/item/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title":"Updated Title"}'

# Mark Complete
curl -X POST https://<api_gateway_url>/item/<id>/done \
  -H "Authorization: Bearer ${TOKEN}"

# Delete Todo
curl -X DELETE https://<api_gateway_url>/item/<id> \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Cleanup

```bash
cd infra/
terraform destroy -var="hw_region=cn-north-4" -var="jwt_secret=<secret>" -var="stage_name=prod"
```

---

## Detailed Documentation

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | User registration |
| POST | `/auth/login` | None | User login, get JWT |
| GET | `/item` | JWT | Get all Todos for current user |
| GET | `/item/{id}` | JWT | Get single Todo |
| POST | `/item` | JWT | Create new Todo |
| PUT | `/item/{id}` | JWT | Update Todo |
| POST | `/item/{id}/done` | JWT | Mark Todo complete |
| DELETE | `/item/{id}` | JWT | Delete Todo |

### Data Model

**todos collection**:
| Field | Type | Description |
|-------|------|-------------|
| `cognito-username` | String | User identifier (partition key) |
| `id` | String | Todo unique ID (sort key) |
| `title` | String | Todo title |
| `completed` | Boolean | Completion status |
| `creation_date` | String | Creation timestamp |
| `lastupdate_date` | String | Update timestamp |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_URI` | MongoDB connection string |
| `TABLE_NAME` | Collection name (todos) |
| `JWT_SECRET` | JWT signing secret |
| `REGION` | Region |
| `NODE_ENV` | Environment (production) |

---

## Dependencies and Credits

### Key Dependencies

| Dependency | Version | Description |
|------------|---------|-------------|
| mongodb | ^4.17.0 | MongoDB native driver |
| uuid | ^9.0.0 | UUID generation |
| jsonwebtoken | ^9.0.2 | JWT signing and verification |
| bcryptjs | ^2.4.3 | Password hashing |

### Credits

- Original architecture reference: [aws-samples/lambda-refarch-webapp](https://github.com/aws-samples/lambda-refarch-webapp)
- Huawei Cloud Terraform Provider: [huaweicloud/huaweicloud](https://registry.terraform.io/providers/huaweicloud/huaweicloud)

---

## FAQ

### Q: Function returns 502, what should I do?
A: Check: 1) Is the function correctly bound to APIG? 2) Does RDS MySQL security group allow VPC access on port 8635? 3) Is the function environment variable `DB_URI` correct?

### Q: Authentication failed (401), how to troubleshoot?
A: Confirm: 1) Request header includes `Authorization: Bearer <token>`; 2) JWT secret matches login time; 3) Token not expired (default 7 days).

### Q: Frontend cannot access?
A: Check: 1) OBS bucket CORS configuration; 2) Static website hosting enabled; 3) Bucket ACL is public-read.

---

## License

MIT No Attribution - Copyright (c) 2026 Huawei Cloud

---

## Contact

- **Maintainer**: 
- **Feedback**: Issues and Pull Requests are welcome
