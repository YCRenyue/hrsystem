/**
 * OAuth Helper Functions
 * Provides utility functions for OAuth authentication flows
 */

/**
 * Generate DingTalk OAuth login URL
 *
 * @param {Object} options - OAuth configuration
 * @param {string} options.clientId - DingTalk client ID
 * @param {string} options.redirectUri - Callback URL
 * @param {string} options.scope - OAuth scope
 * @param {string} options.state - State parameter for CSRF protection
 * @returns {string} OAuth login URL
 */
function generateDingTalkLoginUrl(options) {
  const {
    clientId,
    redirectUri,
    scope = 'openid',
    state = generateRandomState()
  } = options;

  if (!clientId || !redirectUri) {
    throw new Error('clientId and redirectUri are required');
  }

  const baseUrl = 'https://login.dingtalk.com/oauth2/auth';
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    response_type: 'code',
    client_id: clientId,
    scope,
    state,
    prompt: 'consent'
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate random state for CSRF protection
 *
 * @returns {string} Random state string
 */
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15)
    + Math.random().toString(36).substring(2, 15);
}

/**
 * Validate OAuth state parameter
 *
 * @param {string} receivedState - State received from OAuth provider
 * @param {string} storedState - State stored in session
 * @returns {boolean} True if states match
 */
function validateState(receivedState, storedState) {
  return receivedState === storedState;
}

module.exports = {
  generateDingTalkLoginUrl,
  generateRandomState,
  validateState
};
