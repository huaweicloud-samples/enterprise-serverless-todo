// MongoDB 适配器 - 华为云 GeminiDB MongoDB 原生驱动
// 使用 mongodb 官方驱动
// 提供兼容接口（get/put/update/delete/scan）

const { MongoClient } = require('mongodb');

const {
  DB_URI,        // mongodb://user:pass@host:port/dbname
  TABLE_NAME,    // collection 名称，默认 todos
  REGION,
} = process.env;

// 单例 MongoClient（函数实例生命周期内复用连接）
let _client = null;
let _db = null;

/**
 * 获取 MongoDB 连接（延迟初始化，单例复用）
 */
async function getClient() {
  if (!_client) {
    const uri = DB_URI || 'mongodb://localhost:8635/todoapp';
    _client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    await _client.connect();
    console.log('[Adapter] MongoDB connected:', uri.replace(/\/\/.*:.*@/, '//***:***@'));
  }
  return _client;
}

/**
 * 获取 collection（懒加载）
 */
async function getCollection() {
  const client = await getClient();
  if (!_db) {
    _db = client.db();
  }
  return _db.collection(TABLE_NAME || 'todos');
}

// ─── docClient 兼容接口 ─────────────────────────────────────────────────────

/**
 * docClient.get({ TableName, Key }) → { promise() }
 * MongoDB GetItem
 */
function get(params) {
  return {
    promise: async () => {
      const col = await getCollection();
      const result = await col.findOne(params.Key);
      return result ? { Item: result } : { Item: null };
    },
  };
}

/**
 * docClient.put({ TableName, Item }) → { promise() }
 * MongoDB PutItem
 */
function put(params) {
  return {
    promise: async () => {
      const col = await getCollection();
      await col.insertOne(params.Item);
      return {};
    },
  };
}

/**
 * docClient.update({ TableName, Key, UpdateExpression, ExpressionAttributeValues, ReturnValues }) → { promise() }
 * MongoDB UpdateItem
 */
function update(params) {
  return {
    promise: async () => {
      const col = await getCollection();
      // 解析 UpdateExpression 如 "SET item = :item, completed = :completed"
      const setObj = {};
      const attrValues = params.ExpressionAttributeValues || {};
      for (const [key, val] of Object.entries(attrValues)) {
        const fieldName = key.replace(/^:/, '');
        setObj[fieldName] = val;
      }
      const result = await col.findOneAndUpdate(
        params.Key,
        { $set: setObj },
        { returnDocument: 'after' }
      );
      return result ? { Attributes: result } : {};
    },
  };
}

/**
 * docClient.delete({ TableName, Key }) → { promise() }
 * MongoDB DeleteItem
 */
function del(params) {
  return {
    promise: async () => {
      const col = await getCollection();
      await col.deleteOne(params.Key);
      return {};
    },
  };
}

/**
 * docClient.scan({ TableName, FilterExpression, ExpressionAttributeValues }) → { promise() }
 * MongoDB Scan（全表扫描，按 username 过滤）
 */
function scan(params) {
  return {
    promise: async () => {
      const col = await getCollection();
      const filter = {};
      if (params.FilterExpression && params.ExpressionAttributeValues) {
        // 支持 "cognito-username = :username" 格式
        const attrValues = params.ExpressionAttributeValues;
        for (const [key, val] of Object.entries(attrValues)) {
          const fieldName = key.replace(/^:/, '');
          filter[fieldName] = val;
        }
      }
      const items = await col.find(filter).toArray();
      return { Items: items };
    },
  };
}

/**
 * MongoDB 客户端封装
 */
const docClient = { get, put, update, delete: del, scan };

module.exports = { docClient, TABLE_NAME, getCollection };
