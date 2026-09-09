// getAllTodo 函数 - 华为云 FunctionGraph 版本
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

function getAllRecords(username) {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'cognito-username = :username',
    ExpressionAttributeValues: { ':username': username },
  };
  return docClient.scan(params).promise();
}

exports.getAllToDoItem = async (event, context) => {
  console.log('[getAllTodo] invoked, requestId:', context.requestId);

  try {
    const username = getCognitoUsername(event);
    if (!username) {
      return response(401, { message: 'Unauthorized' });
    }

    const data = await getAllRecords(username);
    return response(200, { Items: data.Items || [] });
  } catch (err) {
    console.error('[getAllTodo] error:', err.message);
    return response(500, { message: err.message });
  }
};
