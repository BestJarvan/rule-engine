import request from "./axios";

// 查询所有属性
export function fetchAttrList(data) {
  return request({
    url: "/store-center/property/query/page",
    method: "post",
    data,
  });
}

// 属性详情
export function fetchAttrDetails(data) {
  return request({
    url: "/store-center/property/detail",
    method: "post",
    data,
  });
}

// 属性配置属性源
export function fetchQueryPropertyUrlData(data) {
  return request({
    url: "/store-center/property/queryPropertyUrlData",
    method: "post",
    data,
  });
}

// 查询所有事实对象
export function fetchRulesFact(data) {
  return request({
    url: "/rule-link/rule/fact/all",
    method: "post",
    data,
  });
}

// 查询单个对象及字段
export function fetchRulesFactOne(data) {
  return request({
    url: "/rule-link/rule/fact/one",
    method: "post",
    data,
  });
}

// 查询规则详情
export function fetchRuleDetail(data) {
  return request({
    url: "/rule-link/rule/queryOne",
    method: "post",
    data,
  });
}

// 保存规则
export function saveRules(data) {
  return request({
    url: "/rule-link/rule/save",
    method: "post",
    data,
  });
}

// 批量保存规则
export function saveAllRules(data) {
  return request({
    url: "/rule-link/rule/batch/save",
    method: "post",
    data,
  });
}
// 查询规则
export function fetchAllRulesDetail(data) {
  return request({
    url: "/rule-link/rule/scene/one",
    method: "post",
    data,
  });
}
