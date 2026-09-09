// updateTodo 函数 - 华为云 FunctionGraph 版本
// 数据层使用 adapter/mongodb_adapter.js

const { docClient, TABLE_NAME } = require('../../adapter/dynamodb_adapter');

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

function updateRecord(username, recordId, updates) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      'cognito-username': username,
      id: recordId,
    },
    UpdateExpression: 'SET item = :item',
    ExpressionAttributeValues: { ':item': updates.item },
    ReturnValues: 'ALL_NEW',
  };
  return docClient.update(params).promise();
}

exports.updateToDoItem = async (event, context) => {
  console.log('[updateTodo] invoked, requestId:', context.requestId);

  try {
    const username = getCognitoUsername(event);
    if (!username) {
      return response(401, { message: 'Unauthorized' });
    }

    if (!event.pathParameters?.id) {
      return response(400, { message: 'Missing item id' });
    }

    if (!event.body) {
      return response(400, { message: 'Missing request body' });
    }

    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const data = await updateRecord(username, event.pathParameters.id, body);
    return response(200, data);
  } catch (err) {
    console.error('[updateTodo] error:', err.message);
    return response(500, { message: err.message });
  }
};
