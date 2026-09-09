#!/bin/bash
# build-functions.sh
# 将各 FunctionGraph 函数打包为 zip 包，供 Terraform 引用

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/infra"
FUNCTIONS_DIR="$SCRIPT_DIR/src/functions"

mkdir -p "$INFRA_DIR/functions"

# 安装 aws-sdk（用于 DynamoDB DocumentClient）
# 函数运行时需要 npm install，先在临时目录处理
WORK_DIR=$(mktemp -d)
cd "$WORK_DIR"

for func in getTodo getAllTodo addTodo updateTodo completeTodo deleteTodo; do
  echo "Building $func..."

  # 创建函数目录结构
  FUNC_DIR="$WORK_DIR/$func"
  mkdir -p "$FUNC_DIR"

  # 复制适配后的函数代码
  cp "$FUNCTIONS_DIR/$func/app.js" "$FUNC_DIR/"

  # 复制适配器
  cp -r "$SCRIPT_DIR/src/adapter" "$FUNC_DIR/"

  # 安装依赖（aws-sdk 用于 DynamoDB 协议）
  cd "$FUNC_DIR"
  npm init -y --silent
  npm install --silent aws-sdk jsonwebtoken

  # 打包
  cd "$WORK_DIR"
  zip -qr "$INFRA_DIR/functions/${func}.zip" "$func/"
  echo "  → $INFRA_DIR/functions/${func}.zip"
done

# JWT authorizer 函数
echo "Building jwt_authorizer..."
AUTH_DIR="$WORK_DIR/jwt_authorizer"
mkdir -p "$AUTH_DIR"
cp "$SCRIPT_DIR/src/adapter/jwt_authorizer.js" "$AUTH_DIR/index.js"
cd "$AUTH_DIR"
npm init -y --silent
npm install --silent jsonwebtoken
cd "$WORK_DIR"
zip -qr "$INFRA_DIR/functions/jwt_authorizer.zip" jwt_authorizer/
echo "  → $INFRA_DIR/functions/jwt_authorizer.zip"

# 清理
rm -rf "$WORK_DIR"
echo "Done. All function zips built."
