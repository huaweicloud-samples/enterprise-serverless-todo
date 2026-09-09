// getTodo 函数 - 华为云 FunctionGraph 版本

const { docClient, TABLE_NAME } = require('../../adapter/dynamodb_adapter');

// response helper
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

function isValidRequest(event) {
  return (
    event !== null &&
    event.pathParameters !== null &&
    event.pathParameters.id !== null &&
    /^[\w-]+$/.test(event.pathParameters.id)
  );
}

// 从 APIG JWT authorizer context 获取用户名（替代 cognito:username）
function getCognitoUsername(event) {
  const authorizer = event.requestContext?.authorizer;
  if (authorizer) {
    return authorizer['cognito:username'] || authorizer.sub || null;
  }
  return null;
}

function getRecordById(username, recordId) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      'cognito-username': username,
      id: recordId,
    },
  };
  return docClient.get(params).promise();
}

exports.getToDoItem = async (event, context) => {
  console.log('[getTodo] invoked, requestId:', context.requestId);

  if (!isValidRequest(event)) {
    return response(400, { message: 'Error: Invalid request' });
  }

  try {
    const username = getCognitoUsername(event);
    if (!username) {
      return response(401, { message: 'Unauthorized: missing user identity' });
    }

    const data = await getRecordById(username, event.pathParameters.id);
    if (!data.Item) {
      return response(404, { message: 'Item not found' });
    }
    return response(200, data);
  } catch (err) {
    console.error('[getTodo] error:', err.message);
    return response(500, { message: err.message });
  }
};
