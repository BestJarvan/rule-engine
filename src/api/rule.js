import request from './axios'

// 查询所有事实对象
export function fetchRulesFact(data) {
  return request({
    url: '/pay-center/rule/fact/all',
    method: 'post',
    data
  })
}

// 查询单个对象及字段
export function fetchRulesFactOne(data) {
  return request({
    url: '/pay-center/rule/fact/one',
    method: 'post',
    data
  })
}

// 查询规则详情
export function fetchRuleDetail(data) {
  return request({
    url: '/pay-center/rule/queryOne',
    method: 'post',
    data
  })
}

// 保存规则
export function saveRules(data) {
  return request({
    url: '/pay-center/rule/save',
    method: 'post',
    data
  })
}

