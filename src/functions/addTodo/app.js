// addTodo 函数 - 华为云 FunctionGraph 版本
// 数据层使用 adapter/mongodb_adapter.js

const { docClient, TABLE_NAME } = require('../../adapter/dynamodb_adapter');
const { randomUUID } = require('crypto');

const response = (statusCode, body, additionalHeaders = {}) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,HEAD,GET,PUT,POST,DELETE',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    ...additionalHeaders,
  },
});

function getCognitoUsername(event) {
  const authorizer = event.requestContext?.authorizer;
  if (authorizer) {
    return authorizer['cognito:username'] || authorizer.sub || null;
  }
  return null;
}

function addRecord(username, item) {
  const params = {
    TableName: TABLE_NAME,
    Item: {
      'cognito-username': username,
      id: item.id || randomUUID(),
      item: item.item,
      completed: item.completed || false,
      createdAt: new Date().toISOString(),
    },
  };
  return docClient.put(params).promise();
}

exports.addToDoItem = async (event, context) => {
  console.log('[addTodo] invoked, requestId:', context.requestId);

  try {
    const username = getCognitoUsername(event);
    if (!username) {
      return response(401, { message: 'Unauthorized' });
    }

    if (!event.body) {
      return response(400, { message: 'Missing request body' });
    }

    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    if (!body.item) {
      return response(400, { message: 'Missing item field' });
    }

    await addRecord(username, body);
    return response(200, { message: 'Item added' });
  } catch (err) {
    console.error('[addTodo] error:', err.message);
    return response(500, { message: err.message });
  }
};
