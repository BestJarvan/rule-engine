const accessTokenKey = 'YL_ACCESS_TOKEN'
const users = 'YL_USER_INFO'
const userIds = 'USER_ROLE_IDS'

export function getToken() {
  return window.localStorage.getItem(accessTokenKey)
}

export function setToken(token) {
  window.localStorage.setItem(accessTokenKey, token)
  window.localStorage.setItem('user_token', token)
}

export function removeToken() {
  return window.localStorage.removeItem(accessTokenKey)
}

export function getUserInfo() {
  return window.localStorage.getItem(users)
}

export function setUserInfo(info) {
  window.localStorage.setItem(users, JSON.stringify(info))
}

export function removeUserInfo() {
  return window.localStorage.removeItem(users)
}

export function removeHelperUserIds() {
  return window.localStorage.removeItem(userIds)
}