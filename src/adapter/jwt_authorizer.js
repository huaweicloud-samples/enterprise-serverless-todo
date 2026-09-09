// JWT Authorizer - 替代 Cognito Authorizer
// 华为云 APIG 自定义认证器

const jwt = require('jsonwebtoken');

exports.authorize = async (event) => {
  const {
    JWT_SECRET,      // 用户手动配置，禁止硬编码真实值
    JWT_ALGORITHM = 'HS256'
  } = process.env;

  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return generatePolicy('user', 'Deny', event.method, { message: 'Missing Authorization header' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });

    return generatePolicy('user', 'Allow', event.method, {
      sub: decoded.sub || decoded.username,
      'cognito:username': decoded.username || decoded.sub
    });
  } catch (err) {
    return generatePolicy('user', 'Deny', event.method, { message: 'Invalid token: ' + err.message });
  }
};

function generatePolicy(principalId, effect, methodArn, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: methodArn
      }]
    },
    context
  };
}
