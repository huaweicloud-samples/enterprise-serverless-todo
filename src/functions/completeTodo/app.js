// completeTodo 函数 - 华为云 FunctionGraph 版本
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

function completeRecord(username, recordId) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      'cognito-username': username,
      id: recordId,
    },
    UpdateExpression: 'SET completed = :completed',
    ExpressionAttributeValues: { ':completed': true },
    ReturnValues: 'ALL_NEW',
  };
  return docClient.update(params).promise();
}

exports.completeToDoItem = async (event, context) => {
  console.log('[completeTodo] invoked, requestId:', context.requestId);

  try {
    const username = getCognitoUsername(event);
    if (!username) {
      return response(401, { message: 'Unauthorized' });
    }

    if (!event.pathParameters?.id) {
      return response(400, { message: 'Missing item id' });
    }

    const data = await completeRecord(username, event.pathParameters.id);
    return response(200, data);
  } catch (err) {
    console.error('[completeTodo] error:', err.message);
    return response(500, { message: err.message });
  }
};
