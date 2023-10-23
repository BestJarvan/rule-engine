import axios from 'axios'
import { message } from 'antd';

import { requestUrl } from '../config/index'
import { getToken } from '../utils/auth';

const service = axios.create({})

service.interceptors.request.use(
  (config) => {
    const token = getToken()

    config.baseURL = requestUrl

    config.timeout = config.timeout ? config.timeout : 10000 // 自定义超时时间
    token && (config.headers['PicpToken'] = token)

    return config
  },
  (error) => {
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  ({ data }) => {
    const { code, msg } = data
    if (code !== '00000' && code !== 10000 && code !== 10001) {
      // 返回错误
      message.error(msg)
      if (/^A023\d/.test(code)) {
        console.log('token xx')
      }
      return Promise.reject(new Error(msg || 'Error'))
    } else {
      // 正常返回
      return data
    }
  },
  (error) => {
    console.log(`err${error}`) // for debug
    message.error(error.message)
    return Promise.reject(error)
  }
)

export default service
