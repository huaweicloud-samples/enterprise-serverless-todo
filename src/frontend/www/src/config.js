// Huawei Cloud configuration for Todo App frontend
// Replace these values after deploying the infrastructure

const config = {
  "api_base_url": "https://<APIG_INSTANCE_ID>.apigateway.<REGION>.myhuaweicloud.com",
  "redirect_url": "https://todo-frontend-<STAGE>-<REGION>.obs.<REGION>.myhuaweicloud.com",
  "auth_domain": "<APIG_INSTANCE_ID>.apigateway.<REGION>.myhuaweicloud.com",
};

export default config;
