export const isPro = process.env.REACT_APP_ENV === 'master'
console.log('process.env.REACT_APP_ENV: ', process.env.REACT_APP_ENV);

const requestMap = {
  'master': 'https://pre.primecare.top',
  'pre': 'https://uat-pre.primecare.top',
  'serve': 'https://jpicp-test.primecare.top',
}

export const requestUrl = requestMap[process.env.REACT_APP_ENV] || requestMap['master']