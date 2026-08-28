/**
 * Admin Authentication Service Handler
 * Isolated strictly to Admin authentication logic.
 */
export const executeAdminLogin = async (adminLoginFn, username, password) => {
  if (!username || !password) {
    throw new Error('Please enter both admin username and password.');
  }
  return await adminLoginFn(username, password);
};
