import request from './axios'

export function fetchRulesData(params) {
  return request({
    url: `/customer/advertisement/list`,
    method: 'get',
    params
  })
}

