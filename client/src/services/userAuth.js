/**
 * User Authentication Service Handler
 * Isolated strictly to User authentication logic.
 */
export const executeUserLogin = async (loginFn, username, password) => {
  if (!username || !password) {
    throw new Error('Please enter both username and password.');
  }
  return await loginFn(username, password);
};
