export const isPro = process.env.NODE_ENV === 'master'

const requestMap = {
  'master': 'https://pre.primecare.top',
  'serve': 'https://jpicp-test.primecare.top',
}

export const requestUrl = requestMap[process.env.NODE_ENV] || requestMap['master']